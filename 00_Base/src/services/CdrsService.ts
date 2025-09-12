// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { Service } from 'typedi';
import { DEFAULT_LIMIT, DEFAULT_OFFSET } from '../model/PaginatedResponse';
import { OcpiGraphqlClient } from '../graphql/OcpiGraphqlClient';
import { CdrMapper } from '../mapper/CdrMapper';
import { GET_TRANSACTIONS_QUERY } from '../graphql/queries/transaction.queries';
import { ITransactionDto } from '@citrineos/base';
import { PaginatedCdrResponse } from '../model/Cdr';
import {
  GetTransactionsQueryResult,
  GetTransactionsQueryVariables,
  Transactions_Bool_Exp,
} from '../graphql/operations';

@Service()
export class CdrsService {
  constructor(
    private readonly ocpiGraphqlClient: OcpiGraphqlClient,
    private readonly cdrMapper: CdrMapper,
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
      result.Transactions as ITransactionDto[],
    );

    return {
      data: mappedCdr,
      total: result.Transactions.length,
      offset: offset,
      limit: limit,
    } as PaginatedCdrResponse;
  }
}
