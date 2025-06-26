import { Inject, Service } from 'typedi';
import { PaginatedSessionResponse } from '../model/Session';
import { buildOcpiPaginatedResponse, DEFAULT_LIMIT, DEFAULT_OFFSET } from '../model/PaginatedResponse';
import { OcpiResponseStatusCode } from '../model/OcpiResponse';
import { OcpiGraphqlClient } from '../graphql/OcpiGraphqlClient';
import { TransactionQueryBuilder } from './TransactionQueryBuilder';
import { GetTransactionsQuery } from '../graphql/types/graphql';
import { GET_TRANSACTIONS_QUERY } from '../graphql/queries/transaction.queries';

@Service()
export class SessionsService {
  constructor(
    private readonly ocpiGraphqlClient: OcpiGraphqlClient,
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
  ): Promise<PaginatedSessionResponse> {
    const queryOptions = {
      cpoCountryCode: toCountryCode,
      cpoPartyId: toPartyId,
      mspCountryCode: fromCountryCode,
      mspPartyId: fromPartyId,
      dateFrom,
      dateTo,
      offset,
      limit,
    };
    const result = await this.ocpiGraphqlClient.request<GetTransactionsQuery>(GET_TRANSACTIONS_QUERY, queryOptions);

    const response = buildOcpiPaginatedResponse(
      OcpiResponseStatusCode.GenericSuccessCode,
      result.Transactions_aggregate.aggregate?.count || 0,
      limit,
      offset,
      result.Transactions || [],
    );

    return response as unknown as PaginatedSessionResponse;
  }
}
