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
    tenant: ITenantDto,
    transactionDto: ITransactionDto,
  ): Promise<void> {
    const session =
      await this.sessionMapper.mapTransactionToSession(transactionDto);
    const path = `/${tenant.countryCode}/${tenant.partyId}/${session.id}`;
    await this.broadcastSession(tenant, session, HttpMethod.Put, path);
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
    await this.broadcastSession(tenant, session, HttpMethod.Patch, path);
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
    await this.broadcastSession(
      tenant,
      { charging_periods },
      HttpMethod.Patch,
      path,
    );
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
