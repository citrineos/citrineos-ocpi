import { Service } from 'typedi';
import { PaginatedSessionResponse, Session } from '../model/Session';
import {
  Evse,
  MeterValue,
  SequelizeLocationRepository,
  SequelizeTransactionEventRepository,
  Transaction,
  TransactionEvent,
} from '../../../../citrineos-core/01_Data/src/layers/sequelize';
import { Op } from 'sequelize';
import { DEFAULT_LIMIT, DEFAULT_OFFSET } from '../model/PaginatedResponse';
import { SessionMapper } from '../mapper/session.mapper';
import { SessionsClientApi } from '../trigger/SessionsClientApi';
import { PutSessionParams } from '../trigger/param/sessions/put.session.params';

@Service()
export class SessionsService {
  constructor(
    readonly transactionRepository: SequelizeTransactionEventRepository,
    readonly locationRepository: SequelizeLocationRepository,
    readonly sessionMapper: SessionMapper,
    readonly sessionsClientApi: SessionsClientApi,
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
    dateTo?: Date,
    offset: number = DEFAULT_OFFSET,
    limit: number = DEFAULT_LIMIT,
  ): Promise<PaginatedSessionResponse> {
    const where: any = {
      updatedAt: {
        [Op.gte]: dateFrom,
        [Op.lt]: dateTo || new Date(),
      },
    };

    const transactions =
      await this.transactionRepository.transaction.readAllByQuery({
        where,
        offset,
        limit,
        include: [TransactionEvent, MeterValue, Evse],
      });

    const sessions: Session[] = transactions.map((transaction) =>
      this.sessionMapper.mapTransactionToSession(
        fromCountryCode,
        fromPartyId,
        toCountryCode,
        toPartyId,
        transaction,
      ),
    );

    const total = await Transaction.count({ where });
    const response = new PaginatedSessionResponse();
    response.data = sessions;
    response.total = total;
    response.offset = offset;
    response.limit = limit;

    return response;
  }

  private broadcast(transactions: Transaction[]) {
    // todo do we know if we can do put vs patch here, is there a way to have a delta?
    const sessions: Session[] = transactions.map((transaction) =>
      this.sessionMapper.mapTransactionToSession(
        'fromCountryCode',
        'fromPartyId',
        'toCountryCode',
        'toPartyId',
        transaction,
      ),
    );
    sessions.forEach(async (session) => {
      await this.sendSessionToClient(session);
    });
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
