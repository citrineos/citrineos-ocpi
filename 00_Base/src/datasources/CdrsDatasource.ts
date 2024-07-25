import { Inject, Service, Token } from 'typedi';
import { PaginatedResult } from '../model/PaginatedResult';
import { ITransactionDatasource } from './ITransactionDatasource';
import { TRANSACTION_DATASOURCE_SERVICE_TOKEN } from '../services/TransactionFilterService';
import { ICdrsDatasource } from './ICdrsDatasource';
import { CdrMapper } from '../mapper/cdr.mapper';
import { Cdr } from '../model/Cdr';

export const CDR_DATASOURCE_SERVICE_TOKEN = new Token(
  'CDR_DATASOURCE_SERVICE_TOKEN',
);

@Service(CDR_DATASOURCE_SERVICE_TOKEN)
export class CdrsDatasource implements ICdrsDatasource {
  constructor(
    @Inject(TRANSACTION_DATASOURCE_SERVICE_TOKEN)
    private readonly transactionDatasource: ITransactionDatasource,
    private readonly cdrMapper: CdrMapper,
  ) {
  }

  async getCdrs(
    cpoCountryCode: string,
    cpoPartyId: string,
    mspCountryCode: string,
    mspPartyId: string,
    dateFrom?: Date,
    dateTo?: Date,
    offset?: number,
    limit?: number,
  ): Promise<PaginatedResult<Cdr>> {
    const transactionResult = await this.transactionDatasource.getTransactions(
      cpoCountryCode,
      cpoPartyId,
      mspCountryCode,
      mspPartyId,
      dateFrom,
      dateTo,
      offset,
      limit,
      true,
    );

    const result: PaginatedResult<Cdr> = new PaginatedResult<Cdr>();
    result.data = await this.cdrMapper.mapTransactionsToCdrs(
      transactionResult.data,
    );
    result.total = transactionResult.total;

    return result;
  }
}
