// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { Service } from 'typedi';
import type { TariffDTO } from '../model/DTO/tariffs/TariffDTO.js';
import type { PutTariffRequest } from '../model/DTO/tariffs/PutTariffRequest.js';
import { DEFAULT_LIMIT, DEFAULT_OFFSET } from '../model/PaginatedResponse.js';
import { OcpiHeaders } from '../model/OcpiHeaders.js';
import { PaginatedParams } from '../controllers/param/PaginatedParams.js';
import type {
  CreateOrUpdateTariffMutationResult,
  CreateOrUpdateTariffMutationVariables,
  DeleteTariffMutationResult,
  DeleteTariffMutationVariables,
  GetTariffByKeyQueryResult,
  GetTariffByKeyQueryVariables,
  GetTariffByOcpiIdQueryResult,
  GetTariffByOcpiIdQueryVariables,
  GetTariffsQueryResult,
  GetTariffsQueryVariables,
  Tariffs_Bool_Exp,
} from '../graphql/index.js';
import {
  CREATE_OR_UPDATE_TARIFF_MUTATION,
  DELETE_TARIFF_MUTATION,
  GET_TARIFF_BY_KEY_QUERY,
  GET_TARIFF_BY_OCPI_ID_QUERY,
  GET_TARIFFS_QUERY,
  OcpiGraphqlClient,
} from '../graphql/index.js';
import { TariffMapper } from '../mapper/index.js';
import { NotFoundException } from '../exception/NotFoundException.js';
import type { TariffDto } from '@citrineos/base';

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
      return TariffMapper.map(tariff as TariffDto);
    }
    return undefined;
  }

  async getTariffByOcpiId(
    countryCode: string,
    partyId: string,
    tariffId: string,
  ): Promise<TariffDTO | undefined> {
    const result = await this.ocpiGraphqlClient.request<
      GetTariffByOcpiIdQueryResult,
      GetTariffByOcpiIdQueryVariables
    >(GET_TARIFF_BY_OCPI_ID_QUERY, {
      tariffId: parseInt(tariffId, 10),
      countryCode,
      partyId,
    });
    const tariff = result.Tariffs?.[0];
    if (tariff) {
      return TariffMapper.map(tariff as TariffDto);
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
      mappedTariffs.push(TariffMapper.map(tariff as TariffDto));
    }
    return {
      data: mappedTariffs,
      count: result.Tariffs.length,
    };
  }

  async createOrUpdateTariff(
    tariffRequest: PutTariffRequest,
    tenantId?: number,
  ): Promise<TariffDTO> {
    const coreObject = TariffMapper.mapFromOcpi(tariffRequest, tenantId);
    const result = await this.ocpiGraphqlClient.request<
      CreateOrUpdateTariffMutationResult,
      CreateOrUpdateTariffMutationVariables
    >(CREATE_OR_UPDATE_TARIFF_MUTATION, { object: coreObject });
    if (!result.insert_Tariffs_one) {
      throw new Error(`Failed to create or update tariff ${tariffRequest.id}`);
    }
    return TariffMapper.map(result.insert_Tariffs_one as TariffDto);
  }

  async deleteTariff(
    countryCode: string,
    partyId: string,
    tariffId: string,
  ): Promise<void> {
    const tariff = await this.getTariffByOcpiId(countryCode, partyId, tariffId);
    if (!tariff) {
      throw new NotFoundException(
        `Tariff ${tariffId} not found for ${countryCode}/${partyId}`,
      );
    }
    await this.ocpiGraphqlClient.request<
      DeleteTariffMutationResult,
      DeleteTariffMutationVariables
    >(DELETE_TARIFF_MUTATION, {
      id: parseInt(tariffId, 10),
    });
  }
}
