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
    const variables = {
      cpoCountryCode: toCountryCode,
      cpoPartyId: toPartyId,
      mspCountryCode: fromCountryCode,
      mspPartyId: fromPartyId,
      dateFrom: dateFrom ? dateFrom.toISOString() : undefined,
      dateTo: dateTo ? dateTo.toISOString() : undefined,
      offset,
      limit,
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
