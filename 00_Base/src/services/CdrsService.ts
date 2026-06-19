// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { Service } from 'typedi';
import { DEFAULT_LIMIT, DEFAULT_OFFSET } from '../model/PaginatedResponse.js';
import { buildOcpiErrorResponse } from '../model/OcpiErrorResponse.js';
import { buildOcpiResponse } from '../model/OcpiResponse.js';
import { Logger, type ILogObj } from 'tslog';

import type {
  GetTransactionsQueryResult,
  GetTransactionsQueryVariables,
  InsertCdrMutationResult,
  Transactions_Bool_Exp,
  GetCdrByiIdQueryResult,
  GetCdrByiIdQueryVariables,
  GetTenantPartnerByCpoClientAndModuleIdQueryResult,
  GetTenantPartnerByCpoClientAndModuleIdQueryVariables,
  GetCdrByiIdAndRoamingPartnerQueryResult,
  GetCdrByiIdAndRoamingPartnerQueryVariables,
} from '../graphql/index.js';
import { HttpMethod } from '@zetra/citrineos-base';
import { GET_TENANT_PARTNER_BY_OUR_AND_PARTNER_IDENTITY
 } from '../graphql/index.js';
import { GET_TRANSACTIONS_QUERY, OcpiGraphqlClient } from '../graphql/index.js';
import { CdrMapper } from '../mapper/index.js';
import type {
  RoamingPartnerDto,
  TenantPartnerDto,
  TransactionDto,
} from '@zetra/citrineos-base';
import { NotFoundException } from '../exception/NotFoundException.js';
import { findThenUpsert } from '../util/helpers.js';

import type { PaginatedCdrResponse } from '../model/DTO/CdrDTO.js';
import {
  GET_CDR_BY_OUR_ID,
  INSERT_CDR_MUTATION,
  FIND_CDR_ROAMING_QUERY,
  FIND_CDR_P2P_QUERY,
  GET_CDR_BY_OUR_ID_AND_ROAMING_PARTNER,
} from '../graphql/queries/cdr.queries.js';
import type { CdrEntity } from '../model/DTO/CdrDTO.js';
import { OcpiResponseStatusCode } from '../model/OcpiResponse.js';
import { MissingParamException } from '../exception/MissingParamException.js';
import { InvalidParamException } from '../exception/InvalidParamException.js';
import type {
  PullPartnerModulesBody,
  PullSummary,
} from '../model/DTO/PullPartnerModulesBody.js';
import type { Endpoint } from '@zetra/citrineos-base';
import { buildPaginatedParams } from '../trigger/param/PaginatedParams.js';
import type { CdrDTO } from '../model/DTO/CdrDTO.js';
import { z } from 'zod';
import { CdrsClientApi } from '../trigger/CdrsClientApi.js';
import { getRoamingPartner } from '../util/helpers.js';

function extractConstraintField(message: string): string {
  const match = message.match(/null value in column "(\w+)"/);
  return match ? match[1] : 'unknown field';
}

@Service()
export class CdrsService {
  constructor(
    private readonly logger: Logger<ILogObj>,
    private readonly ocpiGraphqlClient: OcpiGraphqlClient,
    private readonly cdrMapper: CdrMapper,
    private readonly cdrsClientApi: CdrsClientApi,
  ) {}

  public async getCdrs(
    fromCountryCode: string,
    fromPartyId: string,
    toCountryCode: string,
    toPartyId: string,
    dateFrom?: Date,
    dateTo?: Date,
    offset: number = DEFAULT_OFFSET,
    limit: number = DEFAULT_LIMIT,
  ): Promise<PaginatedCdrResponse> {
    const where: Transactions_Bool_Exp = {
      Tenant: {
        countryCode: { _eq: toCountryCode },
        partyId: { _eq: toPartyId },
      },
      Authorization: {
        TenantPartner: {
          countryCode: { _eq: fromCountryCode },
          partyId: { _eq: fromPartyId },
        },
      },
    };
    const dateFilters: any = {};
    if (dateFrom) dateFilters._gte = dateFrom.toISOString();
    if (dateTo) dateFilters._lte = dateTo.toISOString();
    if (Object.keys(dateFilters).length > 0) {
      where.updatedAt = dateFilters;
    }
    const variables = {
      offset,
      limit,
      where,
    };
    const result = await this.ocpiGraphqlClient.request<
      GetTransactionsQueryResult,
      GetTransactionsQueryVariables
    >(GET_TRANSACTIONS_QUERY, variables);
    const mappedCdr = await this.cdrMapper.mapTransactionsToCdrs(
      result.Transactions as TransactionDto[],
    );

    return {
      data: mappedCdr,
      total: result.Transactions.length,
      offset: offset,
      limit: limit,
    } as PaginatedCdrResponse;
  }

  async insertCdr(
    tenantPartner: TenantPartnerDto,
    cdr: any,
  ): Promise<any | undefined> {
    if (!tenantPartner.id) {
      throw new Error('Tenant partner not found');
    }

    const roamingPartner = getRoamingPartner(
      tenantPartner,
      cdr.country_code,
      cdr.party_id,
    );

    if (
      (tenantPartner.countryCode !== cdr.country_code ||
        tenantPartner.partyId !== cdr.party_id) &&
      !roamingPartner
    ) {
      throw new Error(
        'Tenant partner does not match session or roaming partner not found',
      );
    }

    const roamingPartnerId = roamingPartner?.id ?? null;

    const objectToInsert = {
      ocpiCdrId: cdr.id,
      countryCode: cdr.country_code,
      partyId: cdr.party_id,
      startDateTime: cdr.start_date_time,
      endDateTime: cdr.end_date_time,
      sessionId: cdr.session_id ?? null,
      cdrToken: cdr.cdr_token,
      authMethod: cdr.auth_method,
      authorizationReference: cdr.authorization_reference ?? null,
      cdrLocation: cdr.cdr_location,
      meterId: cdr.meter_id ?? null,
      currency: cdr.currency,
      tariffs: cdr.tariffs ?? null,
      chargingPeriods: cdr.charging_periods,
      signedData: cdr.signed_data ?? null,
      totalCost: cdr.total_cost,
      totalFixedCost: cdr.total_fixed_cost ?? null,
      totalEnergy: cdr.total_energy,
      totalEnergyCost: cdr.total_energy_cost ?? null,
      totalTime: cdr.total_time,
      totalTimeCost: cdr.total_time_cost ?? null,
      totalParkingTime: cdr.total_parking_time ?? null,
      totalParkingCost: cdr.total_parking_cost ?? null,
      totalReservationCost: cdr.total_reservation_cost ?? null,
      remark: cdr.remark ?? null,
      invoiceReferenceId: cdr.invoice_reference_id ?? null,
      credit: cdr.credit ?? null,
      creditReferenceId: cdr.credit_reference_id ?? null,
      homeChargingCompensation: cdr.home_charging_compensation ?? null,
      lastUpdated: cdr.last_updated,
      tenantId: tenantPartner.tenantId,
      tenantPartnerId: tenantPartner.id,
      roamingPartnerId: roamingPartnerId,
    };
    try {
      type CdrResult = NonNullable<InsertCdrMutationResult['insert_Cdrs_one']>;

      const cdrRow = await findThenUpsert<CdrResult>(this.ocpiGraphqlClient, {
        findQuery:
          roamingPartnerId != null
            ? FIND_CDR_ROAMING_QUERY
            : FIND_CDR_P2P_QUERY,
        findVars:
          roamingPartnerId != null
            ? {
                ocpiCdrId: cdr.id,
                tenantPartnerId: tenantPartner.id,
                roamingPartnerId,
              }
            : { ocpiCdrId: cdr.id, tenantPartnerId: tenantPartner.id },
        findResultKey: 'Cdrs',
        insertQuery: INSERT_CDR_MUTATION,
        insertVars: { object: objectToInsert },
        insertResultKey: 'insert_Cdrs_one',
        updateQuery: INSERT_CDR_MUTATION, // never reached
        updateVars: () => ({ object: objectToInsert }),
        updateResultKey: 'insert_Cdrs_one',
        beforeUpdate: async () => {
          throw new InvalidParamException(
            `CDR with this ID already exists: ${cdr.id}`,
          );
        },
      });
      return cdrRow.id;
    } catch (error) {
      if (error instanceof InvalidParamException) throw error;
      if (error instanceof MissingParamException) throw error;
      const message = error instanceof Error ? error.message : String(error);
      if (
        message.includes('unique constraint') ||
        message.includes('duplicate key')
      ) {
        throw new InvalidParamException(
          `CDR with this ID already exists: ${cdr.id}`,
        );
      }
      if (
        message.includes('constraint-violation') ||
        message.includes('not-null constraint')
      ) {
        throw new MissingParamException(
          `CDR insert failed due to missing required field: ${extractConstraintField(message)}`,
        );
      }
      throw error;
    }
  }

  async putCdrForTenantPartner(
    cdr: any,
    tenantPartner: TenantPartnerDto,
  ): Promise<any | undefined> {
    const cdrId = await this.insertCdr(tenantPartner, cdr);
    return cdrId;
  }

  async getCdrById(
    cdrId: number,
    tenantPartner: TenantPartnerDto,
    roamingPartner: RoamingPartnerDto,
  ): Promise<any | undefined> {
    try {
      if (
        !tenantPartner.countryCode ||
        !tenantPartner.partyId ||
        !tenantPartner.id
      ) {
        throw new Error('Tenant partner not found');
      }
      let response = null;

      if (
        roamingPartner &&
        roamingPartner.id &&
        roamingPartner.countryCode &&
        roamingPartner.partyId
      ) {
        response = await this.ocpiGraphqlClient.request<
          GetCdrByiIdAndRoamingPartnerQueryResult,
          GetCdrByiIdAndRoamingPartnerQueryVariables
        >(GET_CDR_BY_OUR_ID_AND_ROAMING_PARTNER, {
          countryCode: roamingPartner.countryCode,
          partyId: roamingPartner.partyId,
          id: cdrId,
          tenantPartnerId: tenantPartner.id,
          roamingPartnerId: roamingPartner.id,
        });
      } else {
        response = await this.ocpiGraphqlClient.request<
          GetCdrByiIdQueryResult,
          GetCdrByiIdQueryVariables
        >(GET_CDR_BY_OUR_ID, {
          countryCode: tenantPartner.countryCode,
          partyId: tenantPartner.partyId,
          id: cdrId,
          tenantPartnerId: tenantPartner.id,
        });
      }
      if (!response.Cdrs[0]) {
        throw new NotFoundException('Cdr not found for id ' + cdrId.toString());
      }
      const cdr = this.cdrMapper.mapCdrReceiver(response.Cdrs[0] as CdrEntity);

      return buildOcpiResponse(OcpiResponseStatusCode.GenericSuccessCode, cdr);
    } catch (e) {
      this.logger.error(e);
      const statusCode =
        e instanceof NotFoundException
          ? OcpiResponseStatusCode.ClientUnknownLocation
          : OcpiResponseStatusCode.ClientGenericError;
      return buildOcpiErrorResponse(statusCode, (e as Error).message);
    }
  }

  async pullPartnerCdrs(body: PullPartnerModulesBody): Promise<PullSummary> {
    const {
      ourCountryCode,
      ourPartyId,
      partnerCountryCode,
      partnerPartyId,
      offset,
      limit,
      date_from,
      date_to,
    } = body;

    this.logger.info(
      'PullPartnerCdrs',
      ourCountryCode,
      ourPartyId,
      partnerCountryCode,
      partnerPartyId,
    );

    const tenantPartner = await this.ocpiGraphqlClient.request<
      GetTenantPartnerByCpoClientAndModuleIdQueryResult,
      GetTenantPartnerByCpoClientAndModuleIdQueryVariables
    >(GET_TENANT_PARTNER_BY_OUR_AND_PARTNER_IDENTITY
, {
      ourCountryCode: ourCountryCode,
      ourPartyId: ourPartyId,
      partnerCountryCode: partnerCountryCode,
      partnerPartyId: partnerPartyId,
    });

    const partnerRow = tenantPartner.TenantPartners[0];
    if (!partnerRow?.partnerProfileOCPI) {
      throw new Error('Tenant partner missing partnerProfileOCPI');
    }
    const partner = partnerRow as TenantPartnerDto;

    const endpoints = tenantPartner.TenantPartners[0].partnerProfileOCPI!
      .endpoints as Endpoint[];
    const url = endpoints.find(
      (e: Endpoint) => e.identifier === 'cdrs_SENDER',
    )?.url;

    if (!url) {
      throw new Error('No Cdrs URL found');
    }

    const paginated = buildPaginatedParams(
      offset,
      limit,
      date_from != null ? new Date(date_from) : undefined,
      date_to != null ? new Date(date_to) : undefined,
    );

    let currentOffset = offset;
    let hasMore = true;
    let processedCdrs = 0;
    let upsertSucceededCdrs = 0;
    let upsertFailedCdrs = 0;
    let skippedInvalidCdrs = 0;

    while (hasMore) {
      const resp = await this.cdrsClientApi.request(
        ourCountryCode,
        ourPartyId,
        partnerCountryCode,
        partnerPartyId,
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
      );

      for (const item of (resp as any).data) {
        processedCdrs++;
        if (item == null || typeof item !== 'object' || !('id' in item)) {
          skippedInvalidCdrs++;
          continue;
        }
        const cdr = item as CdrDTO;
        try {
          await this.insertCdr(partner, cdr);
          upsertSucceededCdrs++;
          this.logger.info(`PullPartnerCdrs: inserted cdr ${String(cdr.id)}`);
        } catch (err) {
          upsertFailedCdrs++;
          if (err instanceof InvalidParamException) {
            this.logger.debug(
              `PullPartnerCdrs: cdr ${String(cdr.id)} already exists, skipping`,
            );
          } else {
            this.logger.error(
              `PullPartnerCdrs: failed for cdr ${String(cdr.id)}`,
              err,
            );
          }
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
      module: 'cdrs',
      processed: processedCdrs,
      upsertSucceeded: upsertSucceededCdrs,
      upsertFailed: upsertFailedCdrs,
      skippedInvalid: skippedInvalidCdrs,
    };
  }
}
