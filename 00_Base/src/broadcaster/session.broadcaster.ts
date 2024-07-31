import { Service } from 'typedi';
import { Session } from '../model/Session';
import { SessionsClientApi } from '../trigger/SessionsClientApi';
import { Evse, IdToken, SequelizeTransactionEventRepository, Transaction, TransactionEvent } from '@citrineos/data';
import { SessionMapper } from '../mapper/session.mapper';
import { CredentialsService } from '../services/credentials.service';
import { ILogObj, Logger } from 'tslog';
import { BaseBroadcaster } from './BaseBroadcaster';
import { ModuleId } from '../model/ModuleId';
import { PatchSessionParams } from '../trigger/param/sessions/patch.session.params';
import { PutSessionParams } from '../trigger/param/sessions/put.session.params';
import { TransactionEventEnumType, TriggerReasonEnumType } from '@citrineos/base';
import { InternalServerError } from 'routing-controllers';
import { SessionStatus } from '../model/SessionStatus';

@Service()
export class SessionBroadcaster extends BaseBroadcaster {
  private TRANSACTION_EVENTS_DATA_VALUES = 'transactionEvents';
  private METER_VALUES_DATA_VALUES = 'meterValues';

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
            const transactionId = transactionsEvent.transactionDatabaseId;
            if (!transactionId) {
              throw new InternalServerError(
                'No transaction id found for transaction event',
              );
            }
            const transaction =
              await this.transactionEventRepository.transaction.readOnlyOneByQuery(
                {
                  where: { id: transactionId },
                  include: [
                    {
                      model: TransactionEvent,
                      as: Transaction.TRANSACTION_EVENTS_ALIAS,
                      include: [IdToken],
                    },
                    Evse,
                  ],
                },
              );
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
              await this.sendSessionToClients(
                session,
                session.status !== SessionStatus.COMPLETED,
              );
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
            let finalTransactionEvents = [];
            let finalMeterValues = [];
            if (transactionEvent.eventType === TransactionEventEnumType.Ended) {
              finalTransactionEvents = [
                ...(transaction.transactionEvents ?? []),
                transactionEvent,
              ];
              finalMeterValues = [
                ...(transaction.meterValues ?? []),
                ...transactionEvent.meterValue,
              ];
            } else {
              finalTransactionEvents = [transactionEvent];
              finalMeterValues = transactionEvent.meterValue;
            }

            transaction.setDataValue(
              this.TRANSACTION_EVENTS_DATA_VALUES,
              finalTransactionEvents,
            ); // todo use Props
            transaction.setDataValue(
              this.METER_VALUES_DATA_VALUES,
              finalMeterValues,
            ); // todo use Props
            transaction.transactionEvents = finalTransactionEvents;
            transaction.meterValues = finalMeterValues;
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
