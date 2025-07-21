import { Service } from 'typedi';
import { PaginatedSessionResponse } from '../model/Session';
import {
  buildOcpiPaginatedResponse,
  DEFAULT_LIMIT,
  DEFAULT_OFFSET,
} from '../model/PaginatedResponse';
import { OcpiResponseStatusCode } from '../model/OcpiResponse';
import { OcpiGraphqlClient } from '../graphql/OcpiGraphqlClient';
import { GetTransactionsQuery } from '../graphql/types/graphql';
import { GET_TRANSACTIONS_QUERY } from '../graphql/queries/transaction.queries';
import { SessionMapper } from '../mapper/SessionMapper';
import { ITransactionDto } from '@citrineos/base';
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
    const result = await this.ocpiGraphqlClient.request<GetTransactionsQuery>(
      GET_TRANSACTIONS_QUERY,
      queryOptions,
    );

    let mappedSessions = await this.sessionMapper.mapTransactionsToSessions(
      result.Transactions as unknown as ITransactionDto[],
    );

    if (endedOnly) {
      mappedSessions = mappedSessions.filter((session) => session.kwh > 0);
    }

    const response = buildOcpiPaginatedResponse(
      OcpiResponseStatusCode.GenericSuccessCode,
      result.Transactions_aggregate.aggregate?.count || 0,
      limit,
      offset,
      mappedSessions,
    );

    return response as PaginatedSessionResponse;
  }
}
