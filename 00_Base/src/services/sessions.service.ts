import { Service } from 'typedi';
import { PaginatedSessionResponse } from '../model/Session';
import { SequelizeTransactionEventRepository } from '@citrineos/data';
import { buildOcpiPaginatedResponse, DEFAULT_LIMIT, DEFAULT_OFFSET } from '../model/PaginatedResponse';
import { SessionMapper } from '../mapper/session.mapper';
import { OcpiResponseStatusCode } from '../model/ocpi.response';
import {
  ViewTransactionsWithPartyIdAndCountryCodeRepository,
} from '../repository/ViewTransactionsWithPartyIdAndCountryCodeRepository';

@Service()
export class SessionsService {
  constructor(
    private readonly transactionRepository: SequelizeTransactionEventRepository,
    private readonly sessionMapper: SessionMapper,
    private readonly viewTransactionsWithPartyIdAndCountryCodeRepository: ViewTransactionsWithPartyIdAndCountryCodeRepository,
  ) {
    // todo temp
    // this.test();
  }

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

    const sessions = await this.sessionMapper.mapTransactionsToSessions(
      transactions,
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

  /* todo temp for testing
  private test() {
    this.viewTransactionsWithPartyIdAndCountryCodeRepository.readAllByQuery({
      where: {
        [ViewTransactionsWithPartyIdAndCountryCodeProps.countryCode]: 'US',
        [ViewTransactionsWithPartyIdAndCountryCodeProps.partyId]: 'CPO',
      }
    }).then((r) => {
      console.log('herhe', r);
    });
  }*/
}
