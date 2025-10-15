// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { Service } from 'typedi';
import { TariffDTO } from '../model/DTO/tariffs/TariffDTO';
import { DEFAULT_LIMIT, DEFAULT_OFFSET } from '../model/PaginatedResponse';
import { OcpiHeaders } from '../model/OcpiHeaders';
import { PaginatedParams } from '../controllers/param/PaginatedParams';
import { PutTariffRequest } from '../model/DTO/tariffs/PutTariffRequest';
import { OcpiGraphqlClient } from '../graphql/OcpiGraphqlClient';
import {
  // CREATE_OR_UPDATE_TARIFF_MUTATION,
  // DELETE_TARIFF_MUTATION,
  GET_TARIFF_BY_KEY_QUERY,
  GET_TARIFFS_QUERY,
} from '../graphql/queries/tariff.queries';
import { TariffMapper } from '../mapper/TariffMapper';
import { ITariffDto, ITenantDto } from '@citrineos/base';
import {
  GetTariffByKeyQueryResult,
  GetTariffByKeyQueryVariables,
  GetTariffsQueryResult,
  GetTariffsQueryVariables,
  Tariffs_Bool_Exp,
} from '../graphql/operations';

@Service()
export class TariffsService {
  constructor(private readonly ocpiGraphqlClient: OcpiGraphqlClient) {}

  async getTariffByKey(key: {
    id: number;
    countryCode: string;
    partyId: string;
  }): Promise<TariffDTO | undefined> {
    const result = await this.ocpiGraphqlClient.request<
      GetTariffByKeyQueryResult,
      GetTariffByKeyQueryVariables
    >(GET_TARIFF_BY_KEY_QUERY, key);
    const tariff = result.Tariffs?.[0];
    if (tariff) {
      return TariffMapper.map(tariff as ITariffDto);
    }
    return undefined;
  }

  async getTariffs(
    ocpiHeaders: OcpiHeaders,
    paginationParams?: PaginatedParams,
  ): Promise<{ data: TariffDTO[]; count: number }> {
    const limit = paginationParams?.limit ?? DEFAULT_LIMIT;
    const offset = paginationParams?.offset ?? DEFAULT_OFFSET;
    const where: Tariffs_Bool_Exp = {
      Tenant: {
        countryCode: { _eq: ocpiHeaders.toCountryCode },
        partyId: { _eq: ocpiHeaders.toPartyId },
      },
    };
    const dateFilters: any = {};
    if (paginationParams?.dateFrom)
      dateFilters._gte = paginationParams.dateFrom.toISOString();
    if (paginationParams?.dateTo)
      dateFilters._lte = paginationParams?.dateTo.toISOString();
    if (Object.keys(dateFilters).length > 0) {
      where.updatedAt = dateFilters;
    }
    const variables = {
      limit,
      offset,
      where,
    };
    const result = await this.ocpiGraphqlClient.request<
      GetTariffsQueryResult,
      GetTariffsQueryVariables
    >(GET_TARIFFS_QUERY, variables);
    const mappedTariffs: TariffDTO[] = [];
    for (const tariff of result.Tariffs) {
      mappedTariffs.push(TariffMapper.map(tariff as ITariffDto));
    }
    return {
      data: mappedTariffs,
      count: result.Tariffs.length,
    };
  }

  // async createOrUpdateTariff(
  //   tariffRequest: PutTariffRequest,
  // ): Promise<TariffDTO> {
  //   const variables = { tariff: tariffRequest };
  //   const result =
  //     await this.ocpiGraphqlClient.request<CreateOrUpdateTariffMutation>(
  //       CREATE_OR_UPDATE_TARIFF_MUTATION,
  //       variables,
  //     );
  //   return result.insert_Tariffs_one as unknown as TariffDTO;
  // }

  // async deleteTariff(tariffId: number): Promise<void> {
  //   await this.ocpiGraphqlClient.request<any>(DELETE_TARIFF_MUTATION, {
  //     tariffId,
  //   });
  // }
}
