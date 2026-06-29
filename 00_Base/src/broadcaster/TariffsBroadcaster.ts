// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { BaseBroadcaster } from './BaseBroadcaster.js';
import { Service } from 'typedi';
import { TariffsClientApi } from '../trigger/TariffsClientApi.js';
import type { ILogObj } from 'tslog';
import { Logger } from 'tslog';
import { ModuleId } from '../model/ModuleId.js';
import { InterfaceRole } from '../model/InterfaceRole.js';
import type { TariffDto, TenantDto } from '@zetra/citrineos-base';
import { HttpMethod } from '@zetra/citrineos-base';
import type { Tariff } from '../model/Tariff.js';
import { TariffMapper } from '../mapper/index.js';
import { OcpiEmptyResponseSchema } from '../model/OcpiEmptyResponse.js';
import type {
  GetTariffForBroadcastQueryResult,
  GetTariffForBroadcastQueryVariables,
} from '../graphql/index.js';
import {
  GET_TARIFF_BY_KEY_QUERY,
  GET_TARIFF_FOR_BROADCAST_QUERY,
  OcpiGraphqlClient,
} from '../graphql/index.js';

@Service()
export class TariffsBroadcaster extends BaseBroadcaster {
  constructor(
    readonly logger: Logger<ILogObj>,
    readonly tariffsClientApi: TariffsClientApi,
    readonly ocpiGraphqlClient: OcpiGraphqlClient,
  ) {
    super();
  }

  private async broadcast(
    tenant: TenantDto,
    method: HttpMethod,
    path: string,
    tariff?: Partial<Tariff>,
  ): Promise<void> {
    try {
      console.log('BROADCAST TARIFF ', tariff);
      await this.tariffsClientApi.broadcastToClients({
        cpoCountryCode: tenant.countryCode!,
        cpoPartyId: tenant.partyId!,
        moduleId: ModuleId.Tariffs,
        interfaceRole: InterfaceRole.RECEIVER,
        httpMethod: method,
        schema: OcpiEmptyResponseSchema,
        body: tariff,
        path: path,
      });
    } catch (e) {
      this.logger.error(`broadcast${method} failed for Tariff ${path}`, e);
    }
  }

  async broadcastPutTariff(
    tenant: TenantDto,
    tariffDto: Partial<TariffDto>,
  ): Promise<void> {
    console.log('BROADCAST PUT TARIFF ', tariffDto);
    // // if (!tariffDto.currency || !tariffDto.pricePerKwh) {
    this.logger.debug(
      `Fetching data for Tariff ${tariffDto.id} to fill required fields for broadcast PUT`,
    );
    const tariffResponse = await this.ocpiGraphqlClient.request<
      GetTariffForBroadcastQueryResult,
      GetTariffForBroadcastQueryVariables
    >(GET_TARIFF_FOR_BROADCAST_QUERY, {
      id: tariffDto.id!,
      countryCode: tenant.countryCode!,
      partyId: tenant.partyId!,
    });
    if (!tariffResponse?.Tariffs[0]) {
      this.logger.error(
        `Failed to fetch Tariff ${tariffDto.id} data from GraphQL to fill required fields for broadcast PUT`,
      );
      return;
    }
    console.log('BROADCAST PUT TARIFF RESPONSE !!!', tariffResponse);
    // tariffDto.currency = tariffResponse.Tariffs[0].currency;
    // tariffDto.pricePerKwh = tariffResponse.Tariffs[0].pricePerKwh;
    // }

    const tariff = TariffMapper.mapForReceiverOCPI(tariffResponse.Tariffs[0]);
    const path = `/${tenant.countryCode}/${tenant.partyId}/${tariff.id}`;
    await this.broadcast(tenant, HttpMethod.Put, path, tariff);
  }

  async broadcastTariffDeletion(
    tenant: TenantDto,
    tariffDto: TariffDto,
  ): Promise<void> {
    const path = `/${tenant.countryCode}/${tenant.partyId}/${tariffDto.id}`;
    await this.broadcast(tenant, HttpMethod.Delete, path);
  }
}
