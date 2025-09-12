// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import Container, { Service } from 'typedi';
import { PaginatedSessionResponse } from '../model/Session';
import {
  buildOcpiPaginatedResponse,
  DEFAULT_LIMIT,
  DEFAULT_OFFSET,
} from '../model/PaginatedResponse';
import { OcpiResponseStatusCode } from '../model/OcpiResponse';
import { OcpiGraphqlClient } from '../graphql/OcpiGraphqlClient';
import { GET_TRANSACTIONS_QUERY } from '../graphql/queries/transaction.queries';
import { SessionMapper } from '../mapper/SessionMapper';
import { ITransactionDto } from '@citrineos/base';
import {
  GetTransactionsQueryResult,
  GetTransactionsQueryVariables,
  Transactions_Bool_Exp,
} from '../graphql/operations';
import { Logger } from 'tslog';
@Service()
export class SessionsService {
  constructor(
    private readonly ocpiGraphqlClient: OcpiGraphqlClient,
    private readonly sessionMapper: SessionMapper,
  ) {}

  public async getSessions(
    fromCountryCode: string,
    fromPartyId: string,
    toCountryCode: string,
    toPartyId: string,
    dateFrom?: Date,
    dateTo?: Date,
    offset: number = DEFAULT_OFFSET,
    limit: number = DEFAULT_LIMIT,
    endedOnly?: boolean,
  ): Promise<PaginatedSessionResponse> {
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
    const queryOptions = {
      offset,
      limit,
      where,
    };
    const result = await this.ocpiGraphqlClient.request<
      GetTransactionsQueryResult,
      GetTransactionsQueryVariables
    >(GET_TRANSACTIONS_QUERY, queryOptions);

    let mappedSessions = await this.sessionMapper.mapTransactionsToSessions(
      result.Transactions as ITransactionDto[],
    );

    if (endedOnly) {
      mappedSessions = mappedSessions.filter((session) => session.kwh > 0);
    }

    const response = buildOcpiPaginatedResponse(
      OcpiResponseStatusCode.GenericSuccessCode,
      result.Transactions.length,
      limit,
      offset,
      mappedSessions,
    );

    return response as PaginatedSessionResponse;
  }
}
