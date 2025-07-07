import { ITransactionDatasource } from '../datasources/ITransactionDatasource';
import { PaginatedResult } from '../model/PaginatedResult';
import { OcpiGraphqlClient } from '../graphql/OcpiGraphqlClient';
import { Service, Token } from 'typedi';
import { Transaction } from '@citrineos/data';
import { GET_TRANSACTIONS_QUERY } from '../graphql/queries/transaction.queries';
import { TransactionQueryBuilder } from './TransactionQueryBuilder';
import { GetTransactionsQuery } from '../graphql/types/graphql';

export const TRANSACTION_DATASOURCE_SERVICE_TOKEN = new Token(
  'TRANSACTION_DATASOURCE_SERVICE_TOKEN',
);

@Service(TRANSACTION_DATASOURCE_SERVICE_TOKEN)
export class TransactionFilterService implements ITransactionDatasource {
  constructor(
    private readonly ocpiGraphqlClient: OcpiGraphqlClient,
    private readonly transactionQueryBuilder: TransactionQueryBuilder,
  ) {}

  async getTransactions(
    cpoCountryCode: string,
    cpoPartyId: string,
    mspCountryCode: string,
    mspPartyId: string,
    dateFrom?: Date,
    dateTo?: Date,
    offset?: number,
    limit?: number,
    endedOnly?: boolean,
  ): Promise<PaginatedResult<Transaction>> {
    const baseQueryParams = {
      dateFrom,
      dateTo,
      mspCountryCode,
      mspPartyId,
      cpoCountryCode,
      cpoPartyId,
    };

    const queryOptions = this.transactionQueryBuilder.buildQuery(
      {
        ...baseQueryParams,
        offset,
        limit,
      },
      endedOnly,
    );

    const countQueryOptions = {
      ...this.transactionQueryBuilder.buildQuery(baseQueryParams, endedOnly),
      distinct: true,
      col: 'id',
    };

    // Call GraphQL endpoint
    const response = await this.ocpiGraphqlClient.request<GetTransactionsQuery>(GET_TRANSACTIONS_QUERY, queryOptions);
    const transactions = response.Transactions || [];
    const total = response.Transactions_aggregate?.aggregate?.count || 0;

    const result: PaginatedResult<Transaction> = new PaginatedResult<Transaction>();
    result.data = transactions as unknown as Transaction[];
    result.total = total;
    return result;
  }
}
