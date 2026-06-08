// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { Service } from 'typedi';
import type { Session } from '../model/Session.js';
import { Logger, type ILogObj } from 'tslog';
import { DEFAULT_LIMIT, DEFAULT_OFFSET } from '../model/PaginatedResponse.js';
import type {
  GetSessionByOcpiIdQueryResult,
  GetSessionByOcpiIdQueryVariables,
  GetSessionsPaginatedQueryResult,
  GetSessionsPaginatedQueryVariables,
  GetTransactionsQueryResult,
  GetTransactionsQueryVariables,
  Sessions_Bool_Exp,
  Transactions_Bool_Exp,
  GetTenantPartnerByCpoClientAndModuleIdQueryVariables,
  GetTenantPartnerByCpoClientAndModuleIdQueryResult,
  GetSessionByOcpiIdRoamingQueryVariables,
  GetSessionByOcpiIdRoamingQueryResult,
  FindSessionRoamingQueryVariables,
  FindSessionRoamingQueryResult,
  UpdateSessionByPkMutationVariables,
  UpdateSessionByPkMutationResult,
  FindSessionP2pQueryVariables,
  FindSessionP2pQueryResult,
  InsertSessionMutationResult,
} from '../graphql/index.js';
import {
  GET_SESSION_BY_OCPI_ID,
  GET_SESSIONS_PAGINATED,
  GET_TRANSACTIONS_QUERY,
  OcpiGraphqlClient,
  INSERT_SESSION_MUTATION,
  GET_TENANT_PARTNER_BY_CPO_AND_AND_CLIENT,
  GET_SESSION_BY_OCPI_ID_ROAMING_QUERY,
  UPDATE_SESSION_BY_PK_MUTATION,
  FIND_SESSION_ROAMING_QUERY,
  FIND_SESSION_P2P_QUERY,
} from '../graphql/index.js';
import { ReceivedSessionMapper, SessionMapper } from '../mapper/index.js';
import type { TransactionDto } from '@zetra/citrineos-base';
import type { OcpiHeaders } from '../model/OcpiHeaders.js';
import type { PaginatedParams } from '../controllers/param/PaginatedParams.js';
import { NotFoundException } from '../exception/NotFoundException.js';
import { SessionsClientApi } from '../trigger/SessionsClientApi.js';
import type { PullPartnerModulesBody } from '../model/DTO/PullPartnerModulesBody.js';
import type { TenantPartnerDto, Endpoint } from '@zetra/citrineos-base';
import type { PullSummary } from '../model/DTO/PullPartnerModulesBody.js';
import { buildPaginatedParams } from '../trigger/param/PaginatedParams.js';
import { HttpMethod } from '@zetra/citrineos-base';
import { z } from 'zod';
import { findThenUpsert, getRoamingPartner } from '../util/helpers.js';

@Service()
export class SessionsService {
  constructor(
    private readonly ocpiGraphqlClient: OcpiGraphqlClient,
    private readonly logger: Logger<ILogObj>,
    private readonly sessionsClientApi: SessionsClientApi,
    private readonly sessionMapper: SessionMapper,
  ) {}

  /**
   * Sender GET: returns sessions from our own Transactions, filtered by
   * the requesting eMSP partner (from-headers) and our CPO tenant (to-headers).
   */
  public async getSessions(
    ocpiHeaders: OcpiHeaders,
    paginatedParams?: PaginatedParams,
  ): Promise<{ data: Session[]; count: number }> {
    const limit = paginatedParams?.limit ?? DEFAULT_LIMIT;
    const offset = paginatedParams?.offset ?? DEFAULT_OFFSET;

    const where: Transactions_Bool_Exp = {
      Tenant: {
        countryCode: { _eq: ocpiHeaders.toCountryCode },
        partyId: { _eq: ocpiHeaders.toPartyId },
      },
      Authorization: {
        TenantPartner: {
          countryCode: { _eq: ocpiHeaders.fromCountryCode },
          partyId: { _eq: ocpiHeaders.fromPartyId },
        },
      },
    };

    const dateFilters: any = {};
    if (paginatedParams?.dateFrom)
      dateFilters._gte = paginatedParams.dateFrom.toISOString();
    if (paginatedParams?.dateTo)
      dateFilters._lte = paginatedParams.dateTo.toISOString();
    if (Object.keys(dateFilters).length > 0) {
      where.updatedAt = dateFilters;
    }

    const result = await this.ocpiGraphqlClient.request<
      GetTransactionsQueryResult,
      GetTransactionsQueryVariables
    >(GET_TRANSACTIONS_QUERY, { offset, limit, where });

    const mappedSessions = await this.sessionMapper.mapTransactionsToSessions(
      result.Transactions as TransactionDto[],
    );

    return {
      data: mappedSessions,
      count: mappedSessions.length,
    };
  }

  /**
   * Receiver GET: retrieve a session received from a partner CPO.
   */
  public async getSessionByOcpiId(
    countryCode: string,
    partyId: string,
    sessionId: string,
    tenantPartnerId: number,
    tenantPartner: TenantPartnerDto,
  ): Promise<Session | undefined> {
    const roamingPartner = getRoamingPartner(
      tenantPartner,
      countryCode,
      partyId,
    );
    const roamingPartnerId = roamingPartner?.id ?? null;

    const result =
      roamingPartnerId != null
        ? await this.ocpiGraphqlClient.request<
            GetSessionByOcpiIdRoamingQueryResult,
            GetSessionByOcpiIdRoamingQueryVariables
          >(GET_SESSION_BY_OCPI_ID_ROAMING_QUERY, {
            ocpiSessionId: sessionId,
            tenantPartnerId: tenantPartnerId,
            roamingPartnerId: roamingPartnerId,
          })
        : await this.ocpiGraphqlClient.request<
            GetSessionByOcpiIdQueryResult,
            GetSessionByOcpiIdQueryVariables
          >(GET_SESSION_BY_OCPI_ID, {
            ocpiSessionId: sessionId,
            tenantPartnerId,
          });

    const row = result.Sessions?.[0];
    if (!row) return undefined;
    return ReceivedSessionMapper.mapToOcpi(row);
  }

  /**
   * Receiver GET: paginated list of received sessions for a given partner.
   */
  public async getReceivedSessionsPaginated(
    tenantPartnerId: number,
    paginatedParams?: PaginatedParams,
  ): Promise<{ data: Session[]; count: number }> {
    const limit = paginatedParams?.limit ?? DEFAULT_LIMIT;
    const offset = paginatedParams?.offset ?? DEFAULT_OFFSET;

    const where: Sessions_Bool_Exp = {
      tenantPartnerId: { _eq: tenantPartnerId },
    };

    const dateFilters: any = {};
    if (paginatedParams?.dateFrom)
      dateFilters._gte = paginatedParams.dateFrom.toISOString();
    if (paginatedParams?.dateTo)
      dateFilters._lte = paginatedParams.dateTo.toISOString();
    if (Object.keys(dateFilters).length > 0) {
      where.updatedAt = dateFilters;
    }

    const result = await this.ocpiGraphqlClient.request<
      GetSessionsPaginatedQueryResult,
      GetSessionsPaginatedQueryVariables
    >(GET_SESSIONS_PAGINATED, { limit, offset, where });

    const mapped = result.Sessions.map((row) =>
      ReceivedSessionMapper.mapToOcpi(row),
    );
    return { data: mapped, count: mapped.length };
  }

  /**
   * Receiver PUT: create or update a session received from a partner CPO.
   */
  public async upsertSession(
    session: Session,
    tenantId: number,
    tenantPartnerId: number,
    tenantPartner: TenantPartnerDto,
  ): Promise<Session> {
    const roamingPartner = getRoamingPartner(
      tenantPartner,
      session.country_code,
      session.party_id,
    );

    if (
      (tenantPartner.countryCode !== session.country_code ||
        tenantPartner.partyId !== session.party_id) &&
      !roamingPartner
    ) {
      throw new Error(
        'Tenant partner does not match session or roaming partner not found',
      );
    }

    const roamingPartnerId = roamingPartner?.id ?? null;

    const object = ReceivedSessionMapper.mapFromOcpi(
      session,
      tenantId,
      tenantPartnerId,
      roamingPartnerId,
    );

    type SessionResult = NonNullable<
      InsertSessionMutationResult['insert_Sessions_one']
    >;

    const sessionDbRow = await findThenUpsert<SessionResult>(
      this.ocpiGraphqlClient,
      {
        findQuery:
          roamingPartnerId != null
            ? FIND_SESSION_ROAMING_QUERY
            : FIND_SESSION_P2P_QUERY,
        findVars:
          roamingPartnerId != null
            ? { ocpiSessionId: session.id, tenantPartnerId, roamingPartnerId }
            : { ocpiSessionId: session.id, tenantPartnerId },
        findResultKey: 'Sessions',
        insertQuery: INSERT_SESSION_MUTATION,
        insertVars: { object },
        insertResultKey: 'insert_Sessions_one',
        updateQuery: UPDATE_SESSION_BY_PK_MUTATION,
        updateVars: (id) => ({
          id,
          set: ReceivedSessionMapper.mapPartialFromOcpi(session), // or full map minus immutable fields
        }),
        updateResultKey: 'update_Sessions_by_pk',
      },
    );

    if (!sessionDbRow)
      throw new Error(`Failed to reload session ${session.id}`);
    return ReceivedSessionMapper.mapToOcpi(sessionDbRow);
  }

  /**
   * Receiver PATCH: partially update a received session.
   */
  public async patchSession(
    countryCode: string,
    partyId: string,
    sessionId: string,
    tenantPartnerId: number,
    partial: Partial<Session>,
    tenantPartner: TenantPartnerDto,
  ): Promise<Session> {
    // get the existing session to merge the charging_periods with the partial
    const existing_session = await this.getSessionByOcpiId(
      countryCode,
      partyId,
      sessionId,
      tenantPartnerId,
      tenantPartner,
    );
    if (!existing_session) {
      throw new NotFoundException(
        `Session ${sessionId} not found for ${countryCode}/${partyId}`,
      );
    }

    const mergedPartial: Partial<Session> = { ...partial };

    // if the partial has charging_periods, merge them with the existing charging_periods
    if (
      mergedPartial.charging_periods &&
      mergedPartial.charging_periods.length > 0
    ) {
      mergedPartial.charging_periods = [
        ...(existing_session.charging_periods ?? []),
        ...mergedPartial.charging_periods,
      ];
    } else {
      // if the partial does not have charging_periods we remove them from the partial to prevent any changes to the existing charging_periods
      delete mergedPartial.charging_periods;
    }

    const set = ReceivedSessionMapper.mapPartialFromOcpi(mergedPartial);
    const roamingPartner = getRoamingPartner(
      tenantPartner,
      countryCode,
      partyId,
    );
    const findResult =
      roamingPartner?.id != null
        ? await this.ocpiGraphqlClient.request<
            FindSessionRoamingQueryResult,
            FindSessionRoamingQueryVariables
          >(FIND_SESSION_ROAMING_QUERY, {
            ocpiSessionId: sessionId,
            tenantPartnerId,
            roamingPartnerId: roamingPartner.id,
          })
        : await this.ocpiGraphqlClient.request<
            FindSessionP2pQueryResult,
            FindSessionP2pQueryVariables
          >(FIND_SESSION_P2P_QUERY, {
            ocpiSessionId: sessionId,
            tenantPartnerId,
          });

    const dbId = findResult.Sessions[0]?.id;
    if (!dbId) {
      throw new NotFoundException(
        `Session ${sessionId} not found for ${countryCode}/${partyId}`,
      );
    }

    const result = await this.ocpiGraphqlClient.request<
      UpdateSessionByPkMutationResult,
      UpdateSessionByPkMutationVariables
    >(UPDATE_SESSION_BY_PK_MUTATION, {
      id: dbId,
      set,
    });

    const updated = result.update_Sessions_by_pk;
    if (!updated) {
      throw new NotFoundException(
        `Session ${sessionId} not found for ${countryCode}/${partyId}`,
      );
    }
    return ReceivedSessionMapper.mapToOcpi(updated);
  }

  async pullPartnerSessions(
    body: PullPartnerModulesBody,
  ): Promise<PullSummary> {
    const {
      ourCountryCode,
      ourPartyId,
      cpoCountryCode,
      cpoPartyId,
      offset,
      limit,
      date_from,
      date_to,
    } = body;

    this.logger.info(
      'PullPartnerSessions',
      ourCountryCode,
      ourPartyId,
      cpoCountryCode,
      cpoPartyId,
    );

    const tenantPartner = await this.ocpiGraphqlClient.request<
      GetTenantPartnerByCpoClientAndModuleIdQueryResult,
      GetTenantPartnerByCpoClientAndModuleIdQueryVariables
    >(GET_TENANT_PARTNER_BY_CPO_AND_AND_CLIENT, {
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
      (e: Endpoint) => e.identifier === 'sessions_SENDER',
    )?.url;

    if (!url) {
      throw new Error('No sessions URL found');
    }

    const paginated = buildPaginatedParams(
      offset,
      limit,
      date_from != null ? new Date(date_from) : undefined,
      date_to != null ? new Date(date_to) : undefined,
    );

    let currentOffset = offset;
    let hasMore = true;
    let processedSessions = 0;
    let upsertSucceededSessions = 0;
    let upsertFailedSessions = 0;
    let skippedInvalidSessions = 0;

    while (hasMore) {
      const resp = await this.sessionsClientApi.request(
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
      );

      for (const item of (resp as any).data) {
        processedSessions++;
        if (item == null || typeof item !== 'object' || !('id' in item)) {
          skippedInvalidSessions++;
          continue;
        }
        const session = item as Session;
        try {
          await this.upsertSession(
            session,
            partner.tenantId!,
            partner.id!,
            partner,
          );
          upsertSucceededSessions++;
          this.logger.info(
            `PullPartnerSessions: upserted session ${String(session.id)}`,
          );
        } catch (err) {
          upsertFailedSessions++;
          this.logger.error(
            `PullPartnerSessions: failed for session ${String(session.id)}`,
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
      module: 'sessions',
      processed: processedSessions,
      upsertSucceeded: upsertSucceededSessions,
      upsertFailed: upsertFailedSessions,
      skippedInvalid: skippedInvalidSessions,
    };
  }
}
