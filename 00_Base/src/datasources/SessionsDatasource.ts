import { ISessionsDatasource } from './ISessionsDatasource';
import { Session } from '../model/Session';
import { Inject, Service, Token } from 'typedi';
import { SessionMapper } from '../mapper/session.mapper';
import { PaginatedResult } from '../model/PaginatedResult';
import { ITransactionDatasource } from './ITransactionDatasource';
import { TRANSACTION_DATASOURCE_SERVICE_TOKEN } from './TransactionDatasource';

export const SESSION_DATASOURCE_SERVICE_TOKEN = new Token(
  'SESSION_DATASOURCE_SERVICE_TOKEN',
);

@Service(SESSION_DATASOURCE_SERVICE_TOKEN)
export class SessionsDatasource implements ISessionsDatasource {
  constructor(
    @Inject(TRANSACTION_DATASOURCE_SERVICE_TOKEN)
    private readonly transactionDatasource: ITransactionDatasource,
    private readonly sessionMapper: SessionMapper,
  ) {}

  async getSessions(
    cpoCountryCode: string,
    cpoPartyId: string,
    mspCountryCode: string,
    mspPartyId: string,
    dateFrom?: Date,
    dateTo?: Date,
    offset?: number,
    limit?: number,
  ): Promise<PaginatedResult<Session>> {
    const transactionResult = await this.transactionDatasource.getTransactions(
      cpoCountryCode,
      cpoPartyId,
      mspCountryCode,
      mspPartyId,
      dateFrom,
      dateTo,
      offset,
      limit,
    );

    const result: PaginatedResult<Session> = new PaginatedResult<Session>();
    result.data = await this.sessionMapper.mapTransactionsToSessions(
      transactionResult.data,
    );
    result.total = transactionResult.total;

    return result;
  }
}
