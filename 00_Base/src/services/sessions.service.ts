import { Service } from 'typedi';
import { PaginatedSessionResponse, Session } from '../model/Session';
import { SequelizeTransactionEventRepository } from '@citrineos/data';
import {
  buildOcpiPaginatedResponse,
  DEFAULT_LIMIT,
  DEFAULT_OFFSET,
} from '../model/PaginatedResponse';
import { SessionMapper } from '../mapper/session.mapper';
import { OcpiResponseStatusCode } from '../model/ocpi.response';

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
    dateFrom?: Date,
    dateTo?: Date,
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

    const sessions = this.filterBasedOnCountryCodePartyId(
      await this.sessionMapper.mapTransactionsToSessions(transactions),
      fromCountryCode,
      fromPartyId,
      toCountryCode,
      toPartyId,
    );

    const response = buildOcpiPaginatedResponse(
      OcpiResponseStatusCode.GenericSuccessCode,
      total,
      limit,
      offset,
      sessions,
    );

    return response as PaginatedSessionResponse;
  }

  private filterBasedOnCountryCodePartyId(
    sessions: Session[],
    fromCountryCode?: string,
    fromPartyId?: string,
    toCountryCode?: string,
    toPartyId?: string
  ): Session[] {
    let filteredSessions = sessions;
    if (fromCountryCode && fromPartyId) {
      filteredSessions = filteredSessions.filter(session => session.cdr_token?.country_code === fromCountryCode && session.cdr_token?.party_id === fromPartyId);
    }

    if (toCountryCode && toPartyId) {
      filteredSessions = filteredSessions.filter(session => session.country_code === toCountryCode && session.party_id === toPartyId);
    }
    return filteredSessions;
  }
}
