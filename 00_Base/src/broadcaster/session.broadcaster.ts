import { Service } from 'typedi';
import { Session } from '../model/Session';
import { SessionsClientApi } from '../trigger/SessionsClientApi';
import { PutSessionParams } from '../trigger/param/sessions/put.session.params';
import {
  SequelizeTransactionEventRepository,
  Transaction,
} from '../../../../citrineos-core/01_Data';
import { SessionMapper } from '../mapper/session.mapper';

@Service()
export class SessionBroadcaster {
  constructor(
    private readonly transactionRepository: SequelizeTransactionEventRepository,
    private readonly sessionMapper: SessionMapper,
    private readonly sessionsClientApi: SessionsClientApi,
  ) {
    this.transactionRepository.transaction.on('created', (transactions) =>
      this.broadcast(transactions),
    );
    this.transactionRepository.transaction.on('updated', (transactions) =>
      this.broadcast(transactions),
    );
  }

  private async broadcast(transactions: Transaction[]) {
    // todo do we know if we can do put vs patch here, is there a way to have a delta?
    const sessions: Session[] =
      await this.sessionMapper.mapTransactionsToSessions(transactions);

    for (const session of sessions) {
      await this.sendSessionToClient(session);
    }
  }

  private async sendSessionToClient(session: Session): Promise<void> {
    const params = PutSessionParams.build(
      session.country_code,
      session.party_id,
      session.cdr_token.country_code,
      session.cdr_token.party_id,
      session.id,
      session,
    );

    // TODO: Get client information from credentials module
    const clientInformation = new Set();

    // TODO: Get baseUrl from credentials module
    this.sessionsClientApi.baseUrl = 'todo-from-creds';
    await this.sessionsClientApi.putSession(params);
  }
}
