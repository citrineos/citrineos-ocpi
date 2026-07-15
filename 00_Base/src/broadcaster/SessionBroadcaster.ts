// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { BaseBroadcaster } from './BaseBroadcaster.js';
import { Service } from 'typedi';
import { SessionsClientApi } from '../trigger/SessionsClientApi.js';
import type { ILogObj } from 'tslog';
import { Logger } from 'tslog';
import type { Session } from '../model/Session.js';
import { ModuleId } from '../model/ModuleId.js';
import { InterfaceRole } from '../model/InterfaceRole.js';
import type {
  MeterValueDto,
  TenantDto,
  TransactionDto,
} from '@zetra/citrineos-base';
import { HttpMethod } from '@zetra/citrineos-base';
import { SessionMapper } from '../mapper/index.js';
import { OcpiEmptyResponseSchema } from '../model/OcpiEmptyResponse.js';
import { tokenOwnerPartnerFilter } from '../util/helpers.js';

@Service()
export class SessionBroadcaster extends BaseBroadcaster {
  constructor(
    readonly logger: Logger<ILogObj>,
    readonly sessionsClientApi: SessionsClientApi,
    readonly sessionMapper: SessionMapper,
  ) {
    super();
  }

  async broadcastPutSession(
    tenant: TenantDto,
    transactionDto: TransactionDto,
    tokenOwnerTenantPartnerId?: number | null,
  ): Promise<void> {
    const session =
      await this.sessionMapper.mapTransactionToSession(transactionDto);
    const path = `/${tenant.countryCode}/${tenant.partyId}/${session.id}`;
    await this.broadcastSession(
      tenant,
      session,
      HttpMethod.Put,
      path,
      tokenOwnerTenantPartnerId,
    );
  }

  async broadcastPatchSession(
    tenant: TenantDto,
    transactionDto: Partial<TransactionDto>,
    tokenOwnerTenantPartnerId?: number | null,
  ): Promise<void> {
    const session =
      await this.sessionMapper.mapPartialTransactionToPartialSession(
        transactionDto,
      );

    const path = `/${tenant.countryCode}/${tenant.partyId}/${session.id}`;
    await this.broadcastSession(
      tenant,
      session,
      HttpMethod.Patch,
      path,
      tokenOwnerTenantPartnerId,
    );
  }

  async broadcastPatchSessionChargingPeriod(
    tenant: TenantDto,
    meterValueDto: MeterValueDto,
    tokenOwnerTenantPartnerId?: number | null,
  ): Promise<void> {
    const charging_periods = await this.sessionMapper.getChargingPeriods(
      [meterValueDto],
      meterValueDto.tariffId!.toString(),
    );
    const path = `/${tenant.countryCode}/${tenant.partyId}/${meterValueDto.transactionId}`;
    await this.broadcastSession(
      tenant,
      { charging_periods },
      HttpMethod.Patch,
      path,
      tokenOwnerTenantPartnerId,
    );
  }

  private async broadcastSession(
    tenant: TenantDto,
    session: Partial<Session>,
    method: HttpMethod,
    path: string,
    tokenOwnerTenantPartnerId?: number | null,
  ): Promise<void> {
    if (tokenOwnerTenantPartnerId == null) {
      this.logger.debug('No token owner partner, skipping session broadcast');
      return;
    }
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
        partnerFilter: tokenOwnerPartnerFilter(tokenOwnerTenantPartnerId),
      });
    } catch (e) {
      this.logger.error(`broadcast${method}Session failed for ${path}`, e);
    }
  }
}
