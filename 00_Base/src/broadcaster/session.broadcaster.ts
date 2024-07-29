import { Service } from 'typedi';
import { Session } from '../model/Session';
import { SessionsClientApi } from '../trigger/SessionsClientApi';
import {
  IdToken,
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
import { TriggerReasonEnumType } from '@citrineos/base';

@Service()
export class SessionBroadcaster extends BaseBroadcaster {
  constructor(
    readonly logger: Logger<ILogObj>,
    readonly transactionEventRepository: SequelizeTransactionEventRepository,
    readonly sessionMapper: SessionMapper,
    readonly sessionsClientApi: SessionsClientApi,
    readonly credentialsService: CredentialsService,
  ) {
    super();
    this.subscribeToTransactionCreated();
    this.subscribeToTransactionEventCreated();
  }

  private subscribeToTransactionCreated() {
    this.transactionEventRepository.transaction.on(
      'created',
      async (transactions) => {
        if (transactions && transactions.length > 0) {
          this.logger.info(
            'Attempting to broadcast created transactions',
            transactions.map((t) => t.id),
          );
          const [
            transactionIdToLocationMap,
            transactionIdToTokenMap,
            transactionIdToTariffMap,
          ] =
            await this.sessionMapper.getLocationsTokensAndTariffsMapsForTransactions(
              transactions,
            );
          const sessions: Session[] =
            await this.sessionMapper.mapTransactionsToSessionsHelper(
              transactions,
              transactionIdToLocationMap,
              transactionIdToTokenMap,
              transactionIdToTariffMap,
            );
          for (const session of sessions) {
            await this.sendSessionToClients(session);
          }
        }
      },
    );
  }
  private subscribeToTransactionEventCreated() {
    this.transactionEventRepository.on(
      'created',
      async (transactionsEvents: TransactionEvent[]) => {
        if (transactionsEvents && transactionsEvents.length > 0) {
          const transactionEventMap: { [key: string]: TransactionEvent } = {};
          for (const transactionsEvent of transactionsEvents) {
            transactionEventMap[transactionsEvent.id] = transactionsEvent;
          }
          this.logger.info(
            'Attempting to broadcast updated transactions',
            transactionsEvents.map((t) => t.id),
          );
          const transactionsMap: { [key: string]: Transaction } = {};
          for (const transactionsEvent of transactionsEvents) {
            const transaction = (await transactionsEvent.$get('transaction', {
              include: [
                {
                  model: TransactionEvent,
                  include: [IdToken],
                },
              ],
            })) as Transaction;
            if (transaction) {
              transactionsMap[transaction.id] = transaction;
            }
          }
          if (Object.entries(transactionsMap).length === 0) {
            return Promise.resolve(); // skipping because no transaction not yet created for transaction event
          } else {
            const [
              transactionIdToLocationMap,
              transactionIdToTokenMap,
              transactionIdToTariffMap,
            ] =
              await this.sessionMapper.getLocationsTokensAndTariffsMapsForTransactions(
                Object.values(transactionsMap),
              );

            this.prepareTransactionsForPatch(
              transactionsMap,
              transactionEventMap,
            );

            const sessions: Session[] =
              await this.sessionMapper.mapTransactionsToSessionsHelper(
                Object.values(transactionsMap),
                transactionIdToLocationMap,
                transactionIdToTokenMap,
                transactionIdToTariffMap,
              );

            for (const session of sessions) {
              await this.sendSessionToClients(session, true);
            }
          }
        }
      },
    );
  }

  private prepareTransactionsForPatch(
    transactionsMap: { [key: string]: Transaction },
    transactionEventMap: { [key: string]: TransactionEvent },
  ) {
    for (const transactionEvent of Object.values(transactionEventMap)) {
      if (
        transactionEvent.meterValue &&
        transactionEvent.meterValue.length > 0 &&
        transactionEvent.triggerReason !== TriggerReasonEnumType.RemoteStart // skip remote start because it will be handled by PUT
      ) {
        const transactionId = transactionEvent.transactionDatabaseId;
        if (transactionId) {
          const transaction = transactionsMap[transactionId];
          if (transaction) {
            transaction.setDataValue('transactionEvents', [transactionEvent]); // todo use Props
            transaction.setDataValue(
              'meterValues',
              transactionEvent.meterValue,
            ); // todo use Props
            transaction.transactionEvents = [transactionEvent];
            transaction.meterValues = transactionEvent.meterValue;
          }
        }
      } else {
        delete transactionsMap[transactionEvent.transactionDatabaseId!]; // will ensure that the transaction will not be sent
      }
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
        this.buildSessionForPatch(session),
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

  private buildSessionForPatch(session: Session): Partial<Session> {
    return {
      kwh: session.kwh,
      charging_periods: session.charging_periods,
      total_cost: session.total_cost,
      last_updated: session.last_updated,
    };
  }
}
