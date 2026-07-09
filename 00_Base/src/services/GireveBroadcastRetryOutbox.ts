// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { Service } from 'typedi';
import { v4 as uuidv4 } from 'uuid';
import { Container } from 'typedi';
import { OcpiConfigToken, type OcpiConfig } from '../config/ocpi.types.js';
import type { ILogObj } from 'tslog';
import { Logger } from 'tslog';
import { ModuleId } from '../model/ModuleId.js';
import { HttpMethod } from '@zetra/citrineos-base';
import { InterfaceRole } from '../model/InterfaceRole.js';

import { OcpiGraphqlClient } from '../graphql/index.js';
import {
  CLAIM_GIREVE_BROADCAST_RETRIES,
  FIND_GIREVE_RETRY_QUEUE,
  INSERT_GIREVE_RETRY_QUEUE,
  MARK_GIREVE_RETRY_SENT,
  RELEASE_STALE_GIREVE_RETRY_LOCKS,
  RESCHEDULE_GIREVE_RETRY,
  UPDATE_GIREVE_RETRY_QUEUE,
} from '../graphql/queries/gireveBroadcastRetry.queries.js';

type GireveRetryResourceType = 'session' | 'tariff' | 'cdr';

export interface UpsertGireveRetryInput {
  partnerTenantPartnerId: number;
  cpoCountryCode: string;
  cpoPartyId: string;
  moduleId: ModuleId;
  interfaceRole: InterfaceRole;
  httpMethod: HttpMethod;
  resourceType: GireveRetryResourceType;
  resourceId: string;
  ocpiPath?: string;
  payload: unknown;
  lastError: string;
}

export type GireveRetryQueueItem = {
  id: string;
  partnerTenantPartnerId: number;
  cpoCountryCode: string;
  cpoPartyId: string;
  moduleId: string;
  interfaceRole: string;
  httpMethod: string;
  resourceType: string;
  resourceId: string;
  ocpiPath?: string | null;
  payload: unknown;
  attemptCount: number;
  nextRetryAt: string;
};

@Service()
export class GireveBroadcastRetryOutbox {
  constructor(
    private readonly ocpiGraphqlClient: OcpiGraphqlClient,
    private readonly logger: Logger<ILogObj>,
  ) {}

  private get config(): OcpiConfig {
    return Container.get<OcpiConfig>(OcpiConfigToken);
  }

  private get retryIntervalSeconds(): number {
    return this.config.gireve?.retryIntervalSeconds ?? 300;
  }

  private get retryBatchSize(): number {
    return this.config.gireve?.retryBatchSize ?? 50;
  }

  private get retryStaleLockSeconds(): number {
    return this.config.gireve?.retryStaleLockSeconds ?? 900;
  }

  /**
   * Upsert a retry item using the dedupe key:
   * (moduleId, partnerTenantPartnerId, resourceType, resourceId) => latest wins.
   */
  async upsertOnFailure(input: UpsertGireveRetryInput): Promise<void> {
    const now = new Date();
    const nextRetryAt = new Date(
      now.getTime() + this.retryIntervalSeconds * 1000,
    );

    const findQuery = FIND_GIREVE_RETRY_QUEUE;

    const existing = await this.ocpiGraphqlClient.request<
      {
        GireveBroadcastRetryQueues: Array<Pick<GireveRetryQueueItem, 'id'>>;
      },
      {
        moduleId: ModuleId;
        partnerTenantPartnerId: number;
        resourceType: GireveRetryResourceType;
        resourceId: string;
      }
    >(findQuery, {
      moduleId: input.moduleId,
      partnerTenantPartnerId: input.partnerTenantPartnerId,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
    });

    const payload = input.payload ?? {};

    if (!existing.GireveBroadcastRetryQueues?.[0]) {
      const insertQuery = INSERT_GIREVE_RETRY_QUEUE;

      await this.ocpiGraphqlClient.request(insertQuery, {
        id: uuidv4(),
        partnerTenantPartnerId: input.partnerTenantPartnerId,
        cpoCountryCode: input.cpoCountryCode,
        cpoPartyId: input.cpoPartyId,
        moduleId: input.moduleId,
        interfaceRole: input.interfaceRole,
        httpMethod: input.httpMethod,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        ocpiPath: input.ocpiPath ?? null,
        payload,
        now,
        nextRetryAt,
        lastError: input.lastError,
      });

      this.logger.info('Gireve retry outbox: inserted pending retry', {
        moduleId: input.moduleId,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        partnerTenantPartnerId: input.partnerTenantPartnerId,
        nextRetryAt: nextRetryAt.toISOString(),
      });

      return;
    }

    const updateQuery = UPDATE_GIREVE_RETRY_QUEUE;

    await this.ocpiGraphqlClient.request(updateQuery, {
      id: existing.GireveBroadcastRetryQueues[0].id,
      updatedAt: now,
      nextRetryAt,
      payload,
      ocpiPath: input.ocpiPath ?? null,
      lastError: input.lastError,
    });

    this.logger.info(
      'Gireve retry outbox: refreshed pending retry payload (dedupe)',
      {
        id: existing.GireveBroadcastRetryQueues[0].id,
        moduleId: input.moduleId,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        partnerTenantPartnerId: input.partnerTenantPartnerId,
        nextRetryAt: nextRetryAt.toISOString(),
      },
    );
  }

  /**
   * Reset rows stuck in processing after a crashed CronJob run.
   */
  async releaseStaleLocks(): Promise<number> {
    const staleBefore = new Date(
      Date.now() - this.retryStaleLockSeconds * 1000,
    );

    const res = await this.ocpiGraphqlClient.request<
      { update_GireveBroadcastRetryQueues: { affected_rows: number } },
      { staleBefore: Date }
    >(RELEASE_STALE_GIREVE_RETRY_LOCKS, { staleBefore });

    const released = res.update_GireveBroadcastRetryQueues?.affected_rows ?? 0;
    if (released > 0) {
      this.logger.warn('Gireve retry outbox: released stale processing locks', {
        released,
        staleBefore: staleBefore.toISOString(),
      });
    }
    return released;
  }

  /**
   * Atomically claim due rows for the current CronJob run (FOR UPDATE SKIP LOCKED).
   */
  async claimDueRetries(
    limit: number = this.retryBatchSize,
  ): Promise<GireveRetryQueueItem[]> {
    const res = await this.ocpiGraphqlClient.request<
      { claim_gireve_broadcast_retries: GireveRetryQueueItem[] },
      { batchLimit: number }
    >(CLAIM_GIREVE_BROADCAST_RETRIES, { batchLimit: limit });

    return res.claim_gireve_broadcast_retries ?? [];
  }

  async markSent(id: string): Promise<void> {
    const now = new Date();
    const mutation = MARK_GIREVE_RETRY_SENT;

    const res = await this.ocpiGraphqlClient.request<
      { update_GireveBroadcastRetryQueues: { affected_rows: number } },
      { id: string; sentAt: Date }
    >(mutation, {
      id,
      sentAt: now,
    });

    if ((res.update_GireveBroadcastRetryQueues?.affected_rows ?? 0) === 0) {
      this.logger.warn(
        'Gireve retry outbox: markSent skipped (not in processing)',
        { id },
      );
    }
  }

  async reschedule(
    id: string,
    attemptCount: number,
    nextRetryAt: Date,
    lastError: string,
  ): Promise<void> {
    const mutation = RESCHEDULE_GIREVE_RETRY;

    const res = await this.ocpiGraphqlClient.request<
      { update_GireveBroadcastRetryQueues: { affected_rows: number } },
      {
        id: string;
        attemptCount: number;
        nextRetryAt: Date;
        lastError: string;
      }
    >(mutation, {
      id,
      attemptCount,
      nextRetryAt,
      lastError,
    });

    if ((res.update_GireveBroadcastRetryQueues?.affected_rows ?? 0) === 0) {
      this.logger.warn(
        'Gireve retry outbox: reschedule skipped (not in processing)',
        { id },
      );
    }
  }
}
