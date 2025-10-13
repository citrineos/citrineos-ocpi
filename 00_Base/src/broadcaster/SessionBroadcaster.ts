// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { BaseBroadcaster } from './BaseBroadcaster';
import { Service } from 'typedi';
import { SessionsClientApi } from '../trigger/SessionsClientApi';
import { ILogObj, Logger } from 'tslog';
import { Session } from '../model/Session';
import { ModuleId } from '../model/ModuleId';
import { InterfaceRole } from '../model/InterfaceRole';
import {
  HttpMethod,
  IMeterValueDto,
  ITenantDto,
  ITransactionDto,
} from '@citrineos/base';
import { SessionMapper } from '../mapper/SessionMapper';
import { OcpiEmptyResponseSchema } from '../model/OcpiEmptyResponse';
import { CacheWrapper } from '../util/CacheWrapper';
import { ICache } from '@citrineos/base';
import { SessionStatus } from '../model/SessionStatus';

@Service()
export class SessionBroadcaster extends BaseBroadcaster {
  private readonly _cacheWrapper: CacheWrapper;

  constructor(
    readonly logger: Logger<ILogObj>,
    readonly sessionsClientApi: SessionsClientApi,
    readonly sessionMapper: SessionMapper,
    private readonly _cache: ICache,
  ) {
    super();
    this._cacheWrapper = new CacheWrapper(this._cache, this.logger);
  }

  async broadcastPutSession(
    tenant: ITenantDto,
    transactionDto: ITransactionDto,
  ): Promise<void> {
    const session =
      await this.sessionMapper.mapTransactionToSession(transactionDto);
    const path = `/${tenant.countryCode}/${tenant.partyId}/${session.id}`;
    await this.broadcastSession(tenant, session, HttpMethod.Put, path);

    if (session.id) {
      const cacheKey = `session:${session.id}`;
      await this._cache.set(cacheKey, 'true');
      if (session.status === SessionStatus.COMPLETED) {
        await this._cache.remove(cacheKey);
      }
    }
  }

  async broadcastPatchSession(
    tenant: ITenantDto,
    transactionDto: Partial<ITransactionDto>,
  ): Promise<void> {
    const session =
      await this.sessionMapper.mapPartialTransactionToPartialSession(
        transactionDto,
      );
    const path = `/${tenant.countryCode}/${tenant.partyId}/${session.id}`;

    if (session.id) {
      const cacheKey = `session:${session.id}`;
      const keyFound = await this._cacheWrapper.waitForCacheKey(cacheKey);
      if (keyFound) {
        await this.broadcastSession(tenant, session, HttpMethod.Patch, path);
        if (session.status === SessionStatus.COMPLETED) {
          await this._cache.remove(cacheKey);
        }
      } else {
        this.logger.warn(
          `Not broadcasting PATCH for session ${session.id} due to cache timeout.`,
        );
      }
    }
  }

  async broadcastPatchSessionChargingPeriod(
    tenant: ITenantDto,
    meterValueDto: IMeterValueDto,
  ): Promise<void> {
    const charging_periods = await this.sessionMapper.getChargingPeriods(
      [meterValueDto],
      meterValueDto.tariffId!.toString(),
    );
    const path = `/${tenant.countryCode}/${tenant.partyId}/${meterValueDto.transactionId}`;

    if (meterValueDto.transactionId) {
      const cacheKey = `session:${meterValueDto.transactionId}`;
      const keyFound = await this._cacheWrapper.waitForCacheKey(cacheKey);

      if (keyFound) {
        await this.broadcastSession(
          tenant,
          { charging_periods },
          HttpMethod.Patch,
          path,
        );
      } else {
        this.logger.warn(
          `Not broadcasting PATCH for session ${meterValueDto.transactionId} due to cache timeout.`,
        );
      }
    }
  }

  private async broadcastSession(
    tenant: ITenantDto,
    session: Partial<Session>,
    method: HttpMethod,
    path: string,
  ): Promise<void> {
    try {
      await this.sessionsClientApi.broadcastToClients({
        cpoCountryCode: tenant.countryCode!,
        cpoPartyId: tenant.partyId!,
        moduleId: ModuleId.Sessions,
        interfaceRole: InterfaceRole.RECEIVER,
        httpMethod: method,
        schema: OcpiEmptyResponseSchema,
        body: session,
        path: path,
      });
    } catch (e) {
      this.logger.error(`broadcast${method}Session failed for ${path}`, e);
    }
  }
}
