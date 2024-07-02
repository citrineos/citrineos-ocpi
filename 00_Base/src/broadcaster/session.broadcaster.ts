import {Service} from 'typedi';
import {Session} from '../model/Session';
import {SessionsClientApi} from '../trigger/SessionsClientApi';
import {PutSessionParams} from '../trigger/param/sessions/put.session.params';
import {SequelizeTransactionEventRepository, Transaction,} from '@citrineos/data';
import {SessionMapper} from '../mapper/session.mapper';
import {CredentialsService} from '../services/credentials.service';
import {ILogObj, Logger} from "tslog";
import {BaseBroadcaster} from "./BaseBroadcaster";
import {ModuleId} from "../model/ModuleId";

@Service()
export class SessionBroadcaster extends BaseBroadcaster {
  constructor(
    readonly logger: Logger<ILogObj>,
    readonly transactionRepository: SequelizeTransactionEventRepository,
    readonly sessionMapper: SessionMapper,
    readonly sessionsClientApi: SessionsClientApi,
    readonly credentialsService: CredentialsService,
  ) {
    super(logger, credentialsService);
    this.transactionRepository.transaction.on('created', (transactions) =>
      this.broadcast(transactions),
    );
    this.transactionRepository.transaction.on('updated', (transactions) =>
      this.broadcast(transactions),
    );
    this.broadcast([Transaction.build()]).then();
  }

  private async broadcast(transactions: Transaction[]) {
    // todo do we know if we can do put vs patch here, is there a way to have a delta?
    const sessions: Session[] =
      await this.sessionMapper.mapTransactionsToSessions(transactions);

    for (const session of sessions) {
      await this.sendSessionToClients(session);
    }
  }

  private async sendSessionToClients(session: Session): Promise<void> {
    const params = PutSessionParams.build(
      session.id,
      session,
    );
    const cpoCountryCode = session.country_code;
    const cpoPartyId = session.party_id;
    await this.broadcastToClients(
      cpoCountryCode,
      cpoPartyId,
      ModuleId.Sessions,
      params,
      this.sessionsClientApi,
      this.sessionsClientApi.putSession
    );
  }
}
