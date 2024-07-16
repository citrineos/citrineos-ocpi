import { Service } from 'typedi';
import { SequelizeTransactionEventRepository } from '@citrineos/data';
import { DEFAULT_LIMIT, DEFAULT_OFFSET } from '../model/PaginatedResponse';
import { CdrMapper } from '../mapper/cdr.mapper';
import { Cdr, PaginatedCdrResponse } from '../model/Cdr';

@Service()
export class CdrsService {
  constructor(
    private readonly transactionRepository: SequelizeTransactionEventRepository,
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
    const [transactions, total] = await Promise.all([
      this.transactionRepository.getTransactions(
        dateFrom,
        dateTo,
        offset,
        limit,
      ),
      this.transactionRepository.getTransactionsCount(dateFrom, dateTo),
    ]);

    const cdrs = this.filterBasedOnCountryCodePartyId(
      await this.cdrMapper.mapTransactionsToCdrs(transactions),
      fromCountryCode,
      fromPartyId,
      toCountryCode,
      toPartyId
    );

    const response = new PaginatedCdrResponse();
    response.data = cdrs;
    response.total = total;
    response.offset = offset;
    response.limit = limit;

    return response;
  }

  private filterBasedOnCountryCodePartyId(
    cdrs: Cdr[],
    fromCountryCode?: string,
    fromPartyId?: string,
    toCountryCode?: string,
    toPartyId?: string
  ): Cdr[] {
    let filteredCdrs = cdrs;
    if (fromCountryCode && fromPartyId) {
      filteredCdrs = filteredCdrs.filter(cdr => cdr.cdr_token?.country_code === fromCountryCode && cdr.cdr_token?.party_id === fromPartyId);
    }

    if (toCountryCode && toPartyId) {
      filteredCdrs = filteredCdrs.filter(cdr => cdr.country_code === toCountryCode && cdr.party_id === toPartyId);
    }

    return filteredCdrs;
  }
}
