import { Service } from 'typedi';
import { TariffDTO } from '../model/DTO/tariffs/TariffDTO';
import { DEFAULT_LIMIT, DEFAULT_OFFSET } from '../model/PaginatedResponse';
import { OcpiHeaders } from '../model/OcpiHeaders';
import { PaginatedParams } from '../controllers/param/PaginatedParams';
import { PutTariffRequest } from '../model/DTO/tariffs/PutTariffRequest';
import { OcpiGraphqlClient } from '../graphql/OcpiGraphqlClient';
import {
  CREATE_OR_UPDATE_TARIFF_MUTATION,
  DELETE_TARIFF_MUTATION,
  GET_TARIFF_BY_KEY_QUERY,
  GET_TARIFFS_QUERY,
} from '../graphql/queries/tariff.queries';
import {
  CreateOrUpdateTariffMutation,
  GetTariffByKeyQuery,
  GetTariffsQuery,
} from '../graphql/types/graphql';
import { TariffMapper } from '../mapper/TariffMapper';
import { ITariffDto, ITenantDto } from '@citrineos/base';

@Service()
export class TariffsService {
  constructor(
    private readonly ocpiGraphqlClient: OcpiGraphqlClient,
    private readonly tariffMapper: TariffMapper,
  ) {}

  async getTariffByKey(key: { id: string, countryCode: string, partyId: string }): Promise<TariffDTO | undefined> {
    const result = await this.ocpiGraphqlClient.request<GetTariffByKeyQuery>(
      GET_TARIFF_BY_KEY_QUERY,
      key,
    );
    const tariff = result.Tariffs?.[0];
    if (tariff) {
      return this.tariffMapper.map(
        tariff as unknown as ITariffDto,
        (tariff as unknown as any).Tenant as ITenantDto,
      );
    }
    return undefined;
  }

  async getTariffs(
    ocpiHeaders: OcpiHeaders,
    paginationParams?: PaginatedParams,
  ): Promise<{ data: TariffDTO[]; count: number }> {
    const limit = paginationParams?.limit ?? DEFAULT_LIMIT;
    const offset = paginationParams?.offset ?? DEFAULT_OFFSET;
    const variables = {
      limit,
      offset,
      dateFrom: paginationParams?.dateFrom
        ? paginationParams.dateFrom.toISOString()
        : undefined,
      dateTo: paginationParams?.dateTo
        ? paginationParams.dateTo.toISOString()
        : undefined,
      countryCode: ocpiHeaders.toCountryCode,
      partyId: ocpiHeaders.toPartyId,
    };
    const result = await this.ocpiGraphqlClient.request<GetTariffsQuery>(
      GET_TARIFFS_QUERY,
      variables,
    );
    const mappedTariffs: TariffDTO[] = [];
    for (const tariff of result.Tariffs) {
      mappedTariffs.push(
        this.tariffMapper.map(
          tariff as unknown as ITariffDto,
          (tariff as unknown as any).Tenant as ITenantDto,
        ),
      );
    }
    return {
      data: mappedTariffs,
      count: result.Tariffs_aggregate?.aggregate?.count || 0,
    };
  }

  async createOrUpdateTariff(
    tariffRequest: PutTariffRequest,
  ): Promise<TariffDTO> {
    const variables = { tariff: tariffRequest };
    const result =
      await this.ocpiGraphqlClient.request<CreateOrUpdateTariffMutation>(
        CREATE_OR_UPDATE_TARIFF_MUTATION,
        variables,
      );
    return result.insert_Tariffs_one as unknown as TariffDTO;
  }

  async deleteTariff(tariffId: number): Promise<void> {
    await this.ocpiGraphqlClient.request<any>(DELETE_TARIFF_MUTATION, {
      tariffId,
    });
  }
}
