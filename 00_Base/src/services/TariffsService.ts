// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { Service } from 'typedi';
import { Logger, type ILogObj } from 'tslog';

import type { TariffDTO } from '../model/DTO/tariffs/TariffDTO.js';
import type { PutTariffRequest } from '../model/DTO/tariffs/PutTariffRequest.js';
import { DEFAULT_LIMIT, DEFAULT_OFFSET } from '../model/PaginatedResponse.js';
import { OcpiHeaders } from '../model/OcpiHeaders.js';
import { PaginatedParams } from '../controllers/param/PaginatedParams.js';
import type { TenantPartnerDto, Endpoint } from '@zetra/citrineos-base';
import { buildPaginatedParams } from '../trigger/param/PaginatedParams.js';
import { HttpMethod } from '@zetra/citrineos-base';
import { z } from 'zod';
import { findThenUpsert, getRoamingPartner } from '../util/helpers.js';
import type {
  CreateOrUpdateTariffMutationResult,
  CreateOrUpdateTariffMutationVariables,
  DeleteTariffByPartnerMutationResult,
  DeleteTariffByPartnerMutationVariables,
  GetTariffByKeyQueryResult,
  GetTariffByKeyQueryVariables,
  GetTariffByOcpiIdQueryResult,
  GetTariffByOcpiIdQueryVariables,
  GetTariffByPartnerQueryResult,
  GetTariffByPartnerQueryVariables,
  GetTariffsQueryResult,
  GetTariffsQueryVariables,
  GetTenantPartnerIdByCountryPartyQueryResult,
  GetTenantPartnerIdByCountryPartyQueryVariables,
  Tariffs_Bool_Exp,
  GetTenantPartnerByCpoClientAndModuleIdQueryVariables,
  GetTenantPartnerByCpoClientAndModuleIdQueryResult,
  GetTariffByPartnerRoamingPartnerQueryResult,
  GetTariffByPartnerRoamingPartnerQueryVariables,
  DeleteTariffByRoamingPartnerMutationResult,
  DeleteTariffByRoamingPartnerMutationVariables,
  InsertTariffElementsMutationVariables,
  InsertTariffElementsMutationResult,
} from '../graphql/index.js';
import {
  CREATE_OR_UPDATE_TARIFF_MUTATION,
  INSERT_PARTNER_TARIFF_MUTATION,
  DELETE_TARIFF_BY_PARTNER_MUTATION,
  GET_TARIFF_BY_KEY_QUERY,
  GET_TARIFF_BY_OCPI_ID_QUERY,
  GET_TARIFF_BY_PARTNER_QUERY,
  GET_TARIFFS_QUERY,
  GET_TENANT_PARTNER_ID_BY_COUNTRY_PARTY,
  OcpiGraphqlClient,
  DELETE_TARIFF_ELEMENTS_MUTATION,
  GET_TENANT_PARTNER_BY_CPO_AND_CLIENT,
  FIND_PARTNER_TARIFF_QUERY,
  FIND_PARTNER_TARIFF_P2P_QUERY,
  UPDATE_PARTNER_TARIFF_MUTATION,
  GET_TARIFF_BY_PARTNER_ROAMING_PARTNER_QUERY,
  DELETE_TARIFF_BY_ROAMING_PARTNER_MUTATION,
  INSERT_TARIFF_ELEMENTS_MUTATION,
} from '../graphql/index.js';
import { NotFoundException } from '../exception/NotFoundException.js';
import { TariffMapper, type TariffMapInput } from '../mapper/index.js';
import type {
  PullPartnerModulesBody,
  PullSummary,
} from '../model/DTO/PullPartnerModulesBody.js';
import { TariffsClientApi } from '../trigger/TariffsClientApi.js';

@Service()
export class TariffsService {
  constructor(
    private readonly ocpiGraphqlClient: OcpiGraphqlClient,
    private readonly logger: Logger<ILogObj>,
    private readonly tariffsClientApi: TariffsClientApi,
  ) {}

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
      return TariffMapper.mapForSender(tariff as TariffMapInput);
    }
    return undefined;
  }

  /**
   * Receiver GET: retrieve a tariff by its OCPI id (CiString(36)).
   * When the country_code/party_id identify a TenantPartner (CPO source),
   * we filter via the TenantPartner relationship instead of Tenant.
   */
  async getTariffByOcpiId(
    countryCode: string,
    partyId: string,
    tariffId: string,
    tenantPartner?: TenantPartnerDto,
    isPartnerLookup = false,
  ): Promise<TariffDTO | undefined> {
    if (isPartnerLookup) {
      let tpResult = null;
      let tenantPartnerId = tenantPartner?.id ?? null;
      if (!tenantPartner) {
        tpResult = await this.ocpiGraphqlClient.request<
          GetTenantPartnerIdByCountryPartyQueryResult,
          GetTenantPartnerIdByCountryPartyQueryVariables
        >(GET_TENANT_PARTNER_ID_BY_COUNTRY_PARTY, { countryCode, partyId });
        tenantPartner = tpResult.TenantPartners?.[0] as TenantPartnerDto;
      }
      if (tenantPartnerId === undefined) {
        return undefined;
      }

      const roamingPartner = getRoamingPartner(
        tenantPartner,
        countryCode,
        partyId,
      );
      const roamingPartnerId = roamingPartner?.id ?? null;
      tenantPartnerId = tenantPartner?.id ?? null;

      if (!tenantPartnerId) {
        return undefined;
      }

      if (roamingPartnerId) {
        const result = await this.ocpiGraphqlClient.request<
          GetTariffByPartnerRoamingPartnerQueryResult,
          GetTariffByPartnerRoamingPartnerQueryVariables
        >(GET_TARIFF_BY_PARTNER_ROAMING_PARTNER_QUERY, {
          ocpiTariffId: tariffId,
          tenantPartnerId,
          roamingPartnerId,
        });
        const tariff = result.Tariffs?.[0];
        if (tariff) {
          return TariffMapper.mapForReceiver(tariff as TariffMapInput);
        }
        return undefined;
      }

      const result = await this.ocpiGraphqlClient.request<
        GetTariffByPartnerQueryResult,
        GetTariffByPartnerQueryVariables
      >(GET_TARIFF_BY_PARTNER_QUERY, {
        ocpiTariffId: tariffId,
        tenantPartnerId,
      });
      const tariff = result.Tariffs?.[0];
      if (tariff) {
        return TariffMapper.mapForReceiver(tariff as TariffMapInput);
      }
      return undefined;
    }

    const result = await this.ocpiGraphqlClient.request<
      GetTariffByOcpiIdQueryResult,
      GetTariffByOcpiIdQueryVariables
    >(GET_TARIFF_BY_OCPI_ID_QUERY, {
      ocpiTariffId: tariffId,
      countryCode,
      partyId,
    });
    const tariff = result.Tariffs?.[0];
    if (tariff) {
      return TariffMapper.mapForReceiver(tariff as TariffMapInput);
    }
    return undefined;
  }

  /**
   * Sender GET: returns our own tariffs only (tenantPartnerId IS NULL).
   * Tariffs received from partner CPOs are excluded from the Sender interface.
   */
  async getTariffs(
    ocpiHeaders: OcpiHeaders,
    paginationParams?: PaginatedParams,
  ): Promise<{ data: TariffDTO[]; count: number }> {
    const limit = paginationParams?.limit ?? DEFAULT_LIMIT;
    const offset = paginationParams?.offset ?? DEFAULT_OFFSET;
    const where = {
      Tenant: {
        countryCode: { _eq: ocpiHeaders.toCountryCode },
        partyId: { _eq: ocpiHeaders.toPartyId },
      },
      tenantPartnerId: { _is_null: true },
    } as unknown as Tariffs_Bool_Exp;
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
      mappedTariffs.push(TariffMapper.mapForSender(tariff as TariffMapInput));
    }
    return {
      data: mappedTariffs,
      count: result.Tariffs.length,
    };
  }

  async createOrUpdateTariff(
    tariffRequest: PutTariffRequest,
    tenantId?: number,
    tenantPartnerId?: number,
    tenantPartner?: TenantPartnerDto,
  ): Promise<TariffDTO> {
    if (!tenantPartner) {
      throw new Error('Tenant partner not found');
    }

    const roamingPartner = getRoamingPartner(
      tenantPartner,
      tariffRequest.country_code,
      tariffRequest.party_id,
    );

    if (
      (tenantPartner.countryCode !== tariffRequest.country_code ||
        tenantPartner.partyId !== tariffRequest.party_id) &&
      !roamingPartner
    ) {
      throw new Error(
        'Tenant partner country code and party id do not match the tariff request or roaming partner not found',
      );
    }

    const { coreTariff, TariffElements } = TariffMapper.mapFromOcpi(
      tariffRequest,
      tenantId,
      tenantPartnerId,
      roamingPartner,
    );

    const object = {
      ...coreTariff,
      TariffElements: { data: TariffElements },
    };

    if (!tenantPartner.id) {
      throw new Error('Tenant partner not found');
    }

    if (tenantPartnerId !== undefined) {
      const roamingPartnerId = roamingPartner?.id ?? null;

      type TariffResult =
        GetTariffByPartnerRoamingPartnerQueryResult['Tariffs'][number];

      const tariff = await findThenUpsert<TariffResult>(
        this.ocpiGraphqlClient,
        {
          findQuery:
            roamingPartnerId != null
              ? FIND_PARTNER_TARIFF_QUERY
              : FIND_PARTNER_TARIFF_P2P_QUERY,
          findVars:
            roamingPartnerId != null
              ? {
                  ocpiTariffId: tariffRequest.id,
                  tenantPartnerId,
                  roamingPartnerId,
                }
              : { ocpiTariffId: tariffRequest.id, tenantPartnerId },
          findResultKey: 'Tariffs',
          insertQuery: INSERT_PARTNER_TARIFF_MUTATION,
          insertVars: { object },
          insertResultKey: 'insert_Tariffs_one',
          updateQuery: UPDATE_PARTNER_TARIFF_MUTATION,
          updateVars: (id) => ({ id, set: coreTariff }),
          updateResultKey: 'update_Tariffs_by_pk',
          beforeUpdate: async (id) => {
            await this.ocpiGraphqlClient.request(
              DELETE_TARIFF_ELEMENTS_MUTATION,
              { tariffId: id },
            );

            if (TariffElements.length > 0) {
              await this.ocpiGraphqlClient.request<
                InsertTariffElementsMutationResult,
                InsertTariffElementsMutationVariables
              >(INSERT_TARIFF_ELEMENTS_MUTATION, {
                objects: TariffElements.map((el) => ({
                  tariffId: id,
                  priceComponents: el.priceComponents,
                  restrictions: el.restrictions,
                  createdAt: el.createdAt,
                  updatedAt: el.updatedAt,
                })),
              });
            }
          },
        },
      );
      if (!tariff) {
        throw new Error(`Failed to retrieve tariff ${tariffRequest.id}`);
      }
      return TariffMapper.mapForReceiver(tariff as TariffMapInput);
    }

    // Non-partner path (tenant own tariff)
    const result = await this.ocpiGraphqlClient.request<
      CreateOrUpdateTariffMutationResult,
      CreateOrUpdateTariffMutationVariables
    >(CREATE_OR_UPDATE_TARIFF_MUTATION, { object });
    if (!result.insert_Tariffs_one) {
      throw new Error(`Failed to create or update tariff ${tariffRequest.id}`);
    }
    return TariffMapper.mapForSender(
      result.insert_Tariffs_one as TariffMapInput,
    );
  }

  async deleteTariff(
    countryCode: string,
    partyId: string,
    tariffId: string,
    isPartnerLookup = false,
    tenantPartner?: TenantPartnerDto,
  ): Promise<void> {
    if (isPartnerLookup) {
      if (!tenantPartner) {
        throw new NotFoundException(
          `Tariff ${tariffId} not found for ${countryCode}/${partyId}`,
        );
      }

      const roamingPartner = getRoamingPartner(
        tenantPartner,
        countryCode,
        partyId,
      );
      const roamingPartnerId = roamingPartner?.id ?? null;
      const tenantPartnerId = tenantPartner.id;
      if (!tenantPartnerId) {
        throw new NotFoundException(
          `Tariff ${tariffId} not found for ${countryCode}/${partyId}`,
        );
      }

      if (roamingPartnerId != null) {
        const result = await this.ocpiGraphqlClient.request<
          DeleteTariffByRoamingPartnerMutationResult,
          DeleteTariffByRoamingPartnerMutationVariables
        >(DELETE_TARIFF_BY_ROAMING_PARTNER_MUTATION, {
          ocpiTariffId: tariffId,
          tenantPartnerId,
          roamingPartnerId,
        });
        if (!result.delete_Tariffs?.affected_rows) {
          throw new NotFoundException(
            `Tariff ${tariffId} not found for ${countryCode}/${partyId}`,
          );
        }
        return;
      }

      // P2P case
      const result = await this.ocpiGraphqlClient.request<
        DeleteTariffByPartnerMutationResult,
        DeleteTariffByPartnerMutationVariables
      >(DELETE_TARIFF_BY_PARTNER_MUTATION, {
        ocpiTariffId: tariffId,
        tenantPartnerId,
      });
      if (!result.delete_Tariffs?.affected_rows) {
        throw new NotFoundException(
          `Tariff ${tariffId} not found for ${countryCode}/${partyId}`,
        );
      }
      return;
    }

    const tariff = await this.getTariffByOcpiId(
      countryCode,
      partyId,
      tariffId,
      undefined,
      false,
    );
    if (!tariff) {
      throw new NotFoundException(
        `Tariff ${tariffId} not found for ${countryCode}/${partyId}`,
      );
    }
  }

  async pullPartnerTariffs(body: PullPartnerModulesBody): Promise<PullSummary> {
    const {
      ourCountryCode,
      ourPartyId,
      cpoCountryCode,
      cpoPartyId,
      offset,
      limit,
      date_from,
      date_to,
      roamingPartnerCountryCode,
      roamingPartnerPartyId,
    } = body;

    this.logger.info(
      'PullPartnerTariffs',
      ourCountryCode,
      ourPartyId,
      cpoCountryCode,
      cpoPartyId,
      roamingPartnerCountryCode,
      roamingPartnerPartyId,
    );

    const tenantPartner = await this.ocpiGraphqlClient.request<
      GetTenantPartnerByCpoClientAndModuleIdQueryResult,
      GetTenantPartnerByCpoClientAndModuleIdQueryVariables
    >(GET_TENANT_PARTNER_BY_CPO_AND_CLIENT, {
      cpoCountryCode: ourCountryCode,
      cpoPartyId: ourPartyId,
      clientCountryCode: cpoCountryCode,
      clientPartyId: cpoPartyId,
    });

    const partnerRow = tenantPartner.TenantPartners[0];
    if (!partnerRow?.partnerProfileOCPI) {
      throw new Error('Tenant partner missing partnerProfileOCPI');
    }
    const partner = partnerRow as TenantPartnerDto;

    const endpoints = tenantPartner.TenantPartners[0].partnerProfileOCPI!
      .endpoints as Endpoint[];
    const url = endpoints.find(
      (e: Endpoint) => e.identifier === 'tariffs_SENDER',
    )?.url;

    if (!url) {
      throw new Error('No locations URL found');
    }

    const paginated = buildPaginatedParams(
      offset,
      limit,
      date_from != null ? new Date(date_from) : undefined,
      date_to != null ? new Date(date_to) : undefined,
    );

    let currentOffset = offset;
    let hasMore = true;
    let processedTariffs = 0;
    let upsertSucceededTariffs = 0;
    let upsertFailedTariffs = 0;
    let skippedInvalidTariffs = 0;

    while (hasMore) {
      const resp = await this.tariffsClientApi.request(
        ourCountryCode,
        ourPartyId,
        cpoCountryCode,
        cpoPartyId,
        HttpMethod.Get,
        z.any(),
        tenantPartner.TenantPartners[0].partnerProfileOCPI!,
        true,
        url,
        undefined,
        { ...paginated, offset: currentOffset },
        undefined,
        undefined,
        partnerRow.awsSecretCertificateArn,
        roamingPartnerCountryCode ?? null,
        roamingPartnerPartyId ?? null,
      );

      for (const item of (resp as any).data) {
        processedTariffs++;
        if (item == null || typeof item !== 'object' || !('id' in item)) {
          skippedInvalidTariffs++;
          continue;
        }
        const tariff = item as TariffDTO;
        try {
          await this.createOrUpdateTariff(
            tariff as PutTariffRequest,
            partner.tenantId!,
            partner.id!,
            partner,
          );
          upsertSucceededTariffs++;
          this.logger.info(
            `PullPartnerModules: upserted tariff ${String(tariff.id)}`,
          );
        } catch (err) {
          upsertFailedTariffs++;
          this.logger.error(
            `PullPartnerModules: failed for tariff ${String(tariff.id)}`,
            err,
          );
        }
      }

      const nextOffset: number | undefined = (resp as any).offset;
      if (nextOffset != null) {
        currentOffset = nextOffset;
      } else {
        hasMore = false;
      }
    }
    return {
      module: 'tariffs',
      processed: processedTariffs,
      upsertSucceeded: upsertSucceededTariffs,
      upsertFailed: upsertFailedTariffs,
      skippedInvalid: skippedInvalidTariffs,
    };
  }
}
