import { Service } from 'typedi';
import { Session } from '../model/Session';
import { SessionsClientApi } from '../trigger/SessionsClientApi';
import {
  SequelizeTransactionEventRepository,
  Transaction,
} from '@citrineos/data';
import { SessionMapper } from '../mapper/session.mapper';
import { CredentialsService } from '../services/credentials.service';
import { ILogObj, Logger } from 'tslog';
import { BaseBroadcaster } from './BaseBroadcaster';
import { ModuleId } from '../model/ModuleId';
import { OcpiParams } from '../trigger/util/ocpi.params';
import { PatchSessionParams } from '../trigger/param/sessions/patch.session.params';
import { PutSessionParams } from '../trigger/param/sessions/put.session.params';

enum PutOrPatch {
  PUT = 'put',
  PATCH = 'patch',
}

@Service()
export class SessionBroadcaster extends BaseBroadcaster {
  constructor(
    readonly logger: Logger<ILogObj>,
    readonly transactionRepository: SequelizeTransactionEventRepository,
    readonly sessionMapper: SessionMapper,
    readonly sessionsClientApi: SessionsClientApi,
    readonly credentialsService: CredentialsService,
  ) {
    super();
    this.transactionRepository.transaction.on('created', (transactions) => {
      if (transactions && transactions.length > 0) {
        this.logger.info(
          'Attempting to broadcast created transactions',
          transactions.map((t) => t.id),
        );
        this.broadcast(transactions).then();
      }
    });
    this.transactionRepository.transaction.on('updated', (transactions) => {
      if (transactions && transactions.length > 0) {
        this.logger.info(
          'Attempting to broadcast updated transactions',
          transactions.map((t) => t.id),
        );
        this.broadcast(transactions, PutOrPatch.PATCH).then();
      }
    });
  }

  private async broadcast(
    transactions: Transaction[],
    putOrPatch: PutOrPatch = PutOrPatch.PUT,
  ) {
    // todo do we know if we can do put vs patch here, is there a way to have a delta?
    const sessions: Session[] =
      await this.sessionMapper.mapTransactionsToSessions(transactions);

    for (const session of sessions) {
      await this.sendSessionToClients(session, putOrPatch);
    }
  }

  private async sendSessionToClients<T extends OcpiParams>(
    session: Session,
    putOrPatch: PutOrPatch = PutOrPatch.PUT,
  ): Promise<void> {
    let params: any = PutSessionParams.build(session.id, session);
    let clientApiRequest: any = this.sessionsClientApi.putSession;
    if (putOrPatch === PutOrPatch.PATCH) {
      params = PatchSessionParams.build(session.id, session);
      clientApiRequest = this.sessionsClientApi.patchSession;
    }
    const cpoCountryCode = session.country_code;
    const cpoPartyId = session.party_id;
    await this.sessionsClientApi.broadcastToClients(
      cpoCountryCode,
      cpoPartyId,
      ModuleId.Sessions,
      params,
      clientApiRequest.bind(this.sessionsClientApi),
    );
  }
}
