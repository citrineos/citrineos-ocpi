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
  TenantPartnerDto,
  TransactionDto,
} from '@zetra/citrineos-base';
import { HttpMethod } from '@zetra/citrineos-base';
import { SessionMapper } from '../mapper/index.js';
import { OcpiEmptyResponseSchema } from '../model/OcpiEmptyResponse.js';
import { isGirevePartner, tokenOwnerPartnerFilter } from '../util/helpers.js';
import type { BroadcastParams } from '../trigger/BaseClientApi.js';

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
    if (!tokenOwnerTenantPartnerId) {
      this.logger.debug('No token owner partner, skipping session broadcast');
      return;
    }
    await this.broadcastSession(
      tenant,
      session,
      HttpMethod.Put,
      path,
      tokenOwnerPartnerFilter(tokenOwnerTenantPartnerId),
    );
  }

  async broadcastPatchSession(
    tenant: TenantDto,
    transactionDto: TransactionDto,
    tokenOwnerTenantPartnerId?: number | null,
  ): Promise<void> {
    if (tokenOwnerTenantPartnerId == null) {
      this.logger.debug('No token owner partner, skipping session broadcast');
      return;
    }
    // const session =
    //   await this.sessionMapper.mapPartialTransactionToPartialSession(
    //     transactionDto,
    //   );

    // const path = `/${tenant.countryCode}/${tenant.partyId}/${session.id}`;
    // await this.broadcastSession(
    //   tenant,
    //   session,
    //   HttpMethod.Patch,
    //   path,
    //   tokenOwnerTenantPartnerId,
    // );
    const patchBody = await this.sessionMapper.mapIncrementalSessionPatch(
      transactionDto as TransactionDto,
    );
    const putBody = await this.sessionMapper.mapTransactionToSession(
      transactionDto as TransactionDto,
    );
    const path = `/${tenant.countryCode}/${tenant.partyId}/${transactionDto.transactionId}`;
    // Standard partners: PATCH incremental

    const ownerId = tokenOwnerTenantPartnerId;

    await this.broadcastSession(
      tenant,
      patchBody,
      HttpMethod.Patch,
      path,
      (p) => p.id === ownerId && !isGirevePartner(p),
    );

    await this.broadcastSession(
      tenant,
      putBody,
      HttpMethod.Put,
      path,
      (p) => p.id === ownerId && isGirevePartner(p),
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
      tokenOwnerPartnerFilter(tokenOwnerTenantPartnerId!),
    );
  }

  private async broadcastSession(
    tenant: TenantDto,
    session: Partial<Session>,
    method: HttpMethod,
    path: string,
    partnerFilter?: BroadcastParams<
      typeof OcpiEmptyResponseSchema
    >['partnerFilter'],
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
        partnerFilter: partnerFilter,
      });
    } catch (e) {
      this.logger.error(`broadcast${method}Session failed for ${path}`, e);
    }
  }
}
