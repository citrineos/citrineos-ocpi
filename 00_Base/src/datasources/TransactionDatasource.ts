import { ITransactionDatasource } from './ITransactionDatasource';
import { PaginatedResult } from '../model/PaginatedResult';
import { Transaction } from '@citrineos/data/dist/layers/sequelize/model/TransactionEvent/Transaction';
import { Attributes, CountOptions } from 'sequelize/types/model';
import { TransactionQueryBuilder } from './TransactionQueryBuilder';
import { Service, Token } from 'typedi';
import { SequelizeTransactionEventRepository } from '@citrineos/data/dist/layers/sequelize/repository/TransactionEvent';

export const TRANSACTION_DATASOURCE_SERVICE_TOKEN = new Token(
  'TRANSACTION_DATASOURCE_SERVICE_TOKEN',
);

@Service(TRANSACTION_DATASOURCE_SERVICE_TOKEN)
export class TransactionDatasource implements ITransactionDatasource {
  constructor(
    private readonly transactionRepository: SequelizeTransactionEventRepository,
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

    const [transactions, total] = await Promise.all([
      this.transactionRepository.transaction.readAllByQuery(queryOptions),
      Transaction.count(
        countQueryOptions as Omit<
          CountOptions<Attributes<Transaction>>,
          'group'
        >,
      ),
    ]);

    const result: PaginatedResult<Transaction> =
      new PaginatedResult<Transaction>();
    result.data = transactions;
    result.total = total;

    return result;
  }
}
