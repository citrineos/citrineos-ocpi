import { Service } from 'typedi';
import { PaginatedSessionResponse, Session } from '../model/Session';
import {
  SequelizeLocationRepository,
  SequelizeTransactionEventRepository,
  Transaction,
} from '../../../../citrineos-core/01_Data/src/layers/sequelize';
import { DEFAULT_LIMIT, DEFAULT_OFFSET } from '../model/PaginatedResponse';
import { SessionMapper } from '../mapper/session.mapper';
import { SessionsClientApi } from '../trigger/SessionsClientApi';
import { PutSessionParams } from '../trigger/param/sessions/put.session.params';

@Service()
export class SessionsService {
  constructor(
    private readonly transactionRepository: SequelizeTransactionEventRepository,
    private readonly locationRepository: SequelizeLocationRepository,
    private readonly sessionMapper: SessionMapper,
    private readonly sessionsClientApi: SessionsClientApi,
  ) {
    this.transactionRepository.transaction.on('created', (data) =>
      this.broadcast(data),
    );
    this.transactionRepository.transaction.on('updated', (data) =>
      this.broadcast(data),
    );
  }

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

    const sessions = await this.mapTransactionsToSessions(
      fromCountryCode,
      fromPartyId,
      toCountryCode,
      toPartyId,
      transactions,
    );

    const response = new PaginatedSessionResponse();
    response.data = sessions;
    response.total = total;
    response.offset = offset;
    response.limit = limit;

    return response;
  }

  private async mapTransactionsToSessions(
    fromCountryCode: string,
    fromPartyId: string,
    toCountryCode: string,
    toPartyId: string,
    transactions: Transaction[],
  ): Promise<Session[]> {
    const stationIds = transactions.map((transaction) => transaction.stationId);
    const chargingStations =
      await this.locationRepository.getChargingStationsByIds(stationIds);
    const stationIdToLocationIdMap = new Map(
      chargingStations.map((station) => [
        station.id,
        String(station.locationId),
      ]),
    );

    return transactions.map((transaction) =>
      this.sessionMapper.mapTransactionToSession(
        fromCountryCode,
        fromPartyId,
        toCountryCode,
        toPartyId,
        transaction,
        stationIdToLocationIdMap.get(transaction.stationId) || '',
      ),
    );
  }

  private async broadcast(transactions: Transaction[]) {
    const fromCountryCode = 'fromCountryCode';
    const fromPartyId = 'fromPartyId';
    const toCountryCode = 'toCountryCode';
    const toPartyId = 'toPartyId';

    // todo do we know if we can do put vs patch here, is there a way to have a delta?
    const sessions: Session[] = await this.mapTransactionsToSessions(
      fromCountryCode,
      fromPartyId,
      toCountryCode,
      toPartyId,
      transactions,
    );

    for (const session of sessions) {
      await this.sendSessionToClient(session);
    }
  }

  private async sendSessionToClient(session: Session) {
    const countryCode = session.country_code;
    const partyId = session.party_id;
    const clientInformation = new Set() as any; // todo get from credentials module
    // todo need creds module
    this.sessionsClientApi.baseUrl = 'todo-from-creds';
    await this.sessionsClientApi.putSession(
      PutSessionParams.build(
        'fromCountryCode',
        'fromPartyId',
        'toCountryCode',
        'toPartyId',
        'sessionId',
        session,
      ),
    );
  }
}
