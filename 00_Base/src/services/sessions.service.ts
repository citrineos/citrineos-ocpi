import { Service } from 'typedi';
import { PaginatedSessionResponse } from '../model/Session';
import { SequelizeTransactionEventRepository } from '@citrineos/data';
import { DEFAULT_LIMIT, DEFAULT_OFFSET } from '../model/PaginatedResponse';
import { SessionMapper } from '../mapper/session.mapper';

@Service()
export class SessionsService {
  constructor(
    private readonly transactionRepository: SequelizeTransactionEventRepository,
    private readonly sessionMapper: SessionMapper,
  ) {}

  public async getSessions(
    fromCountryCode: string,
    fromPartyId: string,
    toCountryCode: string,
    toPartyId: string,
    dateFrom: Date,
    dateTo: Date = new Date(),
    offset: number = DEFAULT_OFFSET,
    limit: number = DEFAULT_LIMIT,
  ): Promise<PaginatedSessionResponse> {
    const [transactions, total] = await Promise.all([
      this.transactionRepository.getTransactions(
        dateFrom,
        dateTo,
        offset,
        limit,
      ),
      this.transactionRepository.getTransactionsCount(dateFrom, dateTo),
    ]);

    const sessions = await this.sessionMapper.mapTransactionsToSessions(
      transactions,
      fromCountryCode,
      fromPartyId,
      toCountryCode,
      toPartyId,
    );

    const response = new PaginatedSessionResponse();
    response.data = sessions;
    response.total = total;
    response.offset = offset;
    response.limit = limit;

    return response;
  }
}
