import { Service } from 'typedi';
import { Session } from '../model/Session';
import { SessionsClientApi } from '../trigger/SessionsClientApi';
import {
  SequelizeTransactionEventRepository,
  Transaction,
  TransactionEvent,
} from '@citrineos/data';
import { SessionMapper } from '../mapper/session.mapper';
import { CredentialsService } from '../services/credentials.service';
import { ILogObj, Logger } from 'tslog';
import { BaseBroadcaster } from './BaseBroadcaster';
import { ModuleId } from '../model/ModuleId';
import { PatchSessionParams } from '../trigger/param/sessions/patch.session.params';
import { PutSessionParams } from '../trigger/param/sessions/put.session.params';
import { TriggerReasonEnumType } from '@citrineos/base/dist/ocpp/model/enums';

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
    this.transactionRepository.on(
      'created',
      (transactionsEvents: TransactionEvent[]) => {
        if (transactionsEvents && transactionsEvents.length > 0) {
          this.logger.info(
            'Attempting to broadcast updated transactions',
            transactionsEvents.map((t) => t.id),
          );
          this.broadcastPatch(transactionsEvents).then();
        }
      },
    );
  }

  private async broadcastPatch(
    transactionsEvents: TransactionEvent[],
  ): Promise<void> {
    const transactions: Transaction[] = [];
    for (const transactionsEvent of transactionsEvents) {
      if (
        transactionsEvent.meterValue &&
        transactionsEvent.meterValue.length > 0 &&
        transactionsEvent.triggerReason !== TriggerReasonEnumType.RemoteStart // skip remote start because it will be handled by PUT
      ) {
        // skip if there are no meter values in transaction event
        const transaction: Transaction = (await transactionsEvent.$get(
          'transaction',
        )) as Transaction; // todo use Props
        if (transaction) {
          transaction.setDataValue('transactionEvents', [transactionsEvent]); // todo use Props
          transaction.setDataValue('meterValues', transactionsEvent.meterValue); // todo use Props
          transaction.transactionEvents = [transactionsEvent];
          transaction.meterValues = transactionsEvent.meterValue;
          transactions.push(transaction);
        }
      }
    }
    if (transactions.length === 0) {
      return Promise.resolve(); // skipping because no transaction not yet created for transaction event
    } else {
      return await this.broadcast(transactions, true);
    }
  }

  private async broadcast(transactions: Transaction[], isPatch = false) {
    // todo do we know if we can do put vs patch here, is there a way to have a delta?
    const sessions: Session[] =
      await this.sessionMapper.mapTransactionsToSessions(transactions);

    for (const session of sessions) {
      await this.sendSessionToClients(session, isPatch);
    }
  }

  private async sendSessionToClients(
    session: Session,
    isPatch = false,
  ): Promise<void> {
    let params: any = PutSessionParams.build(session.id, session);
    let clientApiRequest: any = this.sessionsClientApi.putSession;
    if (isPatch) {
      params = PatchSessionParams.build(
        session.id,
        this.getSessionForPatch(session),
      );
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

  private getSessionForPatch(session: Session): Partial<Session> {
    return {
      kwh: session.kwh,
      charging_periods: session.charging_periods,
      total_cost: session.total_cost,
      last_updated: session.last_updated,
    };
  }
}
