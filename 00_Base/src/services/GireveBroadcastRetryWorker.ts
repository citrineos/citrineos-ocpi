// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { Service, Container, Inject } from 'typedi';
import type { ILogObj } from 'tslog';
import { Logger } from 'tslog';
import { OcpiConfigToken, type OcpiConfig } from '../config/ocpi.types.js';
import { ModuleId } from '../model/ModuleId.js';
import { HttpMethod } from '@zetra/citrineos-base';
import { OcpiEmptyResponseSchema } from '../model/OcpiEmptyResponse.js';
import { GET_TENANT_PARTNER_BY_ID } from '../graphql/queries/tenantPartner.queries.js';

import { SessionsClientApi } from '../trigger/SessionsClientApi.js';
import { CdrsClientApi } from '../trigger/CdrsClientApi.js';
import { TariffsClientApi } from '../trigger/TariffsClientApi.js';
import { OcpiGraphqlClient } from '../graphql/index.js';

import {
  GireveBroadcastRetryOutbox,
  type GireveRetryQueueItem,
} from './GireveBroadcastRetryOutbox.js';

export interface GireveRetryRunResult {
  processed: number;
  succeeded: number;
  failed: number;
  staleLocksReleased: number;
}

@Service()
export class GireveBroadcastRetryWorker {
  private get config(): OcpiConfig {
    return Container.get<OcpiConfig>(OcpiConfigToken);
  }

  private get retryIntervalSeconds(): number {
    return this.config.gireve?.retryIntervalSeconds ?? 300;
  }

  private get retryBatchSize(): number {
    return this.config.gireve?.retryBatchSize ?? 50;
  }

  constructor(
    private readonly outbox: GireveBroadcastRetryOutbox,
    private readonly logger: Logger<ILogObj>,
    @Inject() private readonly sessionsClientApi: SessionsClientApi,
    @Inject() private readonly cdrsClientApi: CdrsClientApi,
    @Inject() private readonly tariffsClientApi: TariffsClientApi,
    @Inject() private readonly ocpiGraphqlClient: OcpiGraphqlClient,
  ) {}

  /**
   * One-shot batch for CronJob: release stale locks, claim due rows, retry each.
   */
  async runOnce(options?: { batchSize?: number }): Promise<GireveRetryRunResult> {
    const batchSize = options?.batchSize ?? this.retryBatchSize;
    const staleLocksReleased = await this.outbox.releaseStaleLocks();
    const items = await this.outbox.claimDueRetries(batchSize);

    if (items.length > 0) {
      this.logger.info(
        `GireveBroadcastRetryWorker: processing ${items.length} claimed retries`,
      );
    }

    let succeeded = 0;
    let failed = 0;

    for (const item of items) {
      const ok = await this.retryOne(item);
      if (ok) succeeded += 1;
      else failed += 1;
    }

    const result: GireveRetryRunResult = {
      processed: items.length,
      succeeded,
      failed,
      staleLocksReleased,
    };

    this.logger.info('GireveBroadcastRetryWorker: run complete', result);
    return result;
  }

  private partnerByIdQuery = GET_TENANT_PARTNER_BY_ID;

  private parseError(e: unknown): string {
    if (e instanceof Error) return e.stack ?? e.message;
    if (typeof e === 'string') return e;
    try {
      return JSON.stringify(e);
    } catch {
      return String(e);
    }
  }

  private async retryOne(item: GireveRetryQueueItem): Promise<boolean> {
    const now = new Date();

    const partnerRes = await this.ocpiGraphqlClient.request<
      {
        TenantPartners_by_pk?: {
          id: number;
          countryCode: string;
          partyId: string;
          partnerProfileOCPI: any;
          awsSecretCertificateArn?: string | null;
        } | null;
      },
      { id: number }
    >(this.partnerByIdQuery, { id: item.partnerTenantPartnerId });

    const partner = partnerRes.TenantPartners_by_pk;
    if (!partner?.partnerProfileOCPI) {
      await this.outbox.reschedule(
        item.id,
        item.attemptCount + 1,
        new Date(now.getTime() + this.retryIntervalSeconds * 1000),
        `Gireve retry: tenantPartner not found for id=${item.partnerTenantPartnerId}`,
      );
      return false;
    }

    try {
      const toCountryCode = partner.countryCode;
      const toPartyId = partner.partyId;

      switch (item.moduleId as ModuleId) {
        case ModuleId.Sessions: {
          await this.sessionsClientApi.request(
            item.cpoCountryCode,
            item.cpoPartyId,
            toCountryCode,
            toPartyId,
            item.httpMethod as HttpMethod,
            OcpiEmptyResponseSchema,
            partner.partnerProfileOCPI,
            true,
            undefined,
            item.payload,
            undefined,
            undefined,
            item.ocpiPath ?? undefined,
            partner.awsSecretCertificateArn ?? undefined,
          );
          break;
        }
        case ModuleId.Cdrs: {
          await this.cdrsClientApi.request(
            item.cpoCountryCode,
            item.cpoPartyId,
            toCountryCode,
            toPartyId,
            item.httpMethod as HttpMethod,
            OcpiEmptyResponseSchema,
            partner.partnerProfileOCPI,
            true,
            undefined,
            item.payload,
            undefined,
            undefined,
            item.ocpiPath ?? undefined,
            partner.awsSecretCertificateArn ?? undefined,
          );
          break;
        }
        case ModuleId.Tariffs: {
          await this.tariffsClientApi.request(
            item.cpoCountryCode,
            item.cpoPartyId,
            toCountryCode,
            toPartyId,
            item.httpMethod as HttpMethod,
            OcpiEmptyResponseSchema,
            partner.partnerProfileOCPI,
            true,
            undefined,
            item.payload,
            undefined,
            undefined,
            item.ocpiPath ?? undefined,
            partner.awsSecretCertificateArn ?? undefined,
          );
          break;
        }
        default:
          throw new Error(
            `Gireve retry: unsupported moduleId=${item.moduleId}`,
          );
      }

      await this.outbox.markSent(item.id);
      this.logger.info('Gireve retry succeeded', {
        id: item.id,
        moduleId: item.moduleId,
        resourceType: item.resourceType,
        resourceId: item.resourceId,
        partnerTenantPartnerId: item.partnerTenantPartnerId,
      });
      return true;
    } catch (e) {
      const lastError = this.parseError(e);
      const nextRetryAt = new Date(
        now.getTime() + this.retryIntervalSeconds * 1000,
      );

      this.logger.warn('Gireve retry failed, rescheduled', {
        id: item.id,
        moduleId: item.moduleId,
        resourceType: item.resourceType,
        resourceId: item.resourceId,
        attemptCount: item.attemptCount + 1,
        nextRetryAt: nextRetryAt.toISOString(),
      });

      await this.outbox.reschedule(
        item.id,
        item.attemptCount + 1,
        nextRetryAt,
        lastError,
      );
      return false;
    }
  }
}
