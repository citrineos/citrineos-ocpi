import { Service } from 'typedi';
import { SequelizeTransactionEventRepository } from '@citrineos/data';
import { DEFAULT_LIMIT, DEFAULT_OFFSET } from '../model/PaginatedResponse';
import { CdrMapper } from '../mapper/cdr.mapper';
import { PaginatedCdrResponse } from '../model/Cdr';

@Service()
export class CdrsService {
  constructor(
    private readonly transactionRepository: SequelizeTransactionEventRepository,
    private readonly cdrMapper: CdrMapper,
  ) {
  }

  public async getCdrs(
    fromCountryCode: string,
    fromPartyId: string,
    toCountryCode: string,
    toPartyId: string,
    dateFrom: Date,
    dateTo: Date = new Date(),
    offset: number = DEFAULT_OFFSET,
    limit: number = DEFAULT_LIMIT,
  ): Promise<PaginatedCdrResponse> {
    const [transactions, total] = await Promise.all([
      this.transactionRepository.getTransactions(
        dateFrom,
        dateTo,
        offset,
        limit,
      ),
      this.transactionRepository.getTransactionsCount(dateFrom, dateTo),
    ]);

    const cdrs = await this.cdrMapper.mapTransactionsToCdrs(
      transactions,
      fromCountryCode,
      fromPartyId,
      toCountryCode,
      toPartyId,
    );

    const response = new PaginatedCdrResponse();
    response.data = cdrs;
    response.total = total;
    response.offset = offset;
    response.limit = limit;

    return response;
  }
}
