// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { BaseBroadcaster } from './BaseBroadcaster';
import { Service } from 'typedi';
import { TariffsClientApi } from '../trigger/TariffsClientApi';
import { ILogObj, Logger } from 'tslog';
import { ModuleId } from '../model/ModuleId';
import { InterfaceRole } from '../model/InterfaceRole';
import { HttpMethod, ITariffDto, ITenantDto } from '@citrineos/base';
import { Tariff } from '../model/Tariff';
import { TariffMapper } from '../mapper/TariffMapper';
import { OcpiEmptyResponseSchema } from '../model/OcpiEmptyResponse';
import {
  GET_TARIFF_BY_KEY_QUERY,
  GetTariffByKeyQueryResult,
  GetTariffByKeyQueryVariables,
  OcpiGraphqlClient,
} from '../graphql';

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
    tenant: ITenantDto,
    method: HttpMethod,
    path: string,
    tariff?: Partial<Tariff>,
  ): Promise<void> {
    try {
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
    tenant: ITenantDto,
    tariffDto: Partial<ITariffDto>,
  ): Promise<void> {
    if (!tariffDto.currency || !tariffDto.pricePerKwh) {
      this.logger.debug(
        `Currency or pricePerKwh missing in Tariff ${tariffDto.id}, fetching data.`,
      );
      const tariffResponse = await this.ocpiGraphqlClient.request<
        GetTariffByKeyQueryResult,
        GetTariffByKeyQueryVariables
      >(GET_TARIFF_BY_KEY_QUERY, {
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
      tariffDto.currency = tariffResponse.Tariffs[0].currency;
      tariffDto.pricePerKwh = tariffResponse.Tariffs[0].pricePerKwh;
    }

    const tariff = TariffMapper.map(tariffDto);
    const path = `/${tenant.countryCode}/${tenant.partyId}/${tariff.id}`;
    await this.broadcast(tenant, HttpMethod.Put, path, tariff);
  }

  async broadcastTariffDeletion(
    tenant: ITenantDto,
    tariffDto: ITariffDto,
  ): Promise<void> {
    const path = `/${tenant.countryCode}/${tenant.partyId}/${tariffDto.id}`;
    await this.broadcast(tenant, HttpMethod.Delete, path);
  }
}
