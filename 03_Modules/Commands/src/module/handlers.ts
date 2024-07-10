// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import {
  AbstractModule,
  AsHandler,
  CallAction,
  EventGroup,
  HandlerProperties,
  ICache,
  IMessage,
  IMessageHandler,
  IMessageSender,
  RequestStartStopStatusEnumType,
  RequestStartTransactionResponse,
  RequestStopTransactionResponse,
  SystemConfig,
} from '@citrineos/base';
import { RabbitMqReceiver, RabbitMqSender, Timer } from '@citrineos/util';
import deasyncPromise from 'deasync-promise';
import { ILogObj, Logger } from 'tslog';
import {
  AsyncResponder,
  CommandResult,
  CommandResultType,
  OcpiParams,
  Session,
  SessionMapper
} from '@citrineos/ocpi-base';
import { Service } from 'typedi';
import { SequelizeTransactionEventRepository } from '@citrineos/data';

/**
 * Component that handles provisioning related messages.
 */
@Service()
export class CommandsOcppHandlers extends AbstractModule {
  /**
   * Fields
   */
  protected _requests: CallAction[] = [];
  protected _responses: CallAction[] = [
    CallAction.RequestStartTransaction,
    CallAction.RequestStopTransaction,
  ];

  constructor(
    config: SystemConfig,
    cache: ICache,
    readonly asyncResponder: AsyncResponder,
    readonly transactionEventRepository: SequelizeTransactionEventRepository,
    readonly sessionMapper: SessionMapper,
    sender?: IMessageSender,
    handler?: IMessageHandler,
    logger?: Logger<ILogObj>,
  ) {
    super(
      config,
      cache,
      handler ?? new RabbitMqReceiver(config, logger),
      sender ?? new RabbitMqSender(config, logger),
      EventGroup.Commands,
      logger,
    );

    const timer = new Timer();
    this._logger.info('Initializing...');

    if (!deasyncPromise(this._initHandler(this._requests, this._responses))) {
      throw new Error(
        'Could not initialize module due to failure in handler initialization.',
      );
    }

    this._logger.info(`Initialized in ${timer.end()}ms...`);
  }

  @AsHandler(CallAction.RequestStartTransaction)
  protected async _handleRequestStartTransactionResponse(
    message: IMessage<RequestStartTransactionResponse>,
    props?: HandlerProperties,
  ): Promise<void> {
    this._logger.debug('Handling RequestStartTransaction:', message, props);

    const result = this.getResult(message.payload.status);

    let session: Session | undefined;
    if (message.payload.transactionId) {
      const transaction = await this.transactionEventRepository.findByTransactionId(message.payload.transactionId);
      if (transaction) {
          session = (await this.sessionMapper.mapTransactionsToSessions([transaction]))[0];
      }
    }
    if (!session) {
      throw new Error('Session not found');
    }

    this.sendCommandResult(
      message.context.correlationId,
      result,
      new OcpiParams(session.country_code, session.party_id, session.cdr_token.country_code, session.cdr_token.party_id),
    );
  }

  @AsHandler(CallAction.RequestStopTransaction)
  protected _handleRequestStopTransactionResponse(
    message: IMessage<RequestStopTransactionResponse>,
    props?: HandlerProperties,
  ): void {
    this._logger.debug('Handling RequestStopTransaction:', message, props);

    const result = this.getResult(message.payload.status);

    this.sendCommandResult(message.context.correlationId, result);
  }

  private getResult(
    requestStartStopStatus: RequestStartStopStatusEnumType,
  ): CommandResultType {
    switch (requestStartStopStatus) {
      case RequestStartStopStatusEnumType.Accepted:
        return CommandResultType.ACCEPTED;
      case RequestStartStopStatusEnumType.Rejected:
        return CommandResultType.REJECTED;
      default:
        throw new Error(
          `Unknown RequestStartStopStatusEnumType: ${requestStartStopStatus}`,
        );
    }
  }

  private async sendCommandResult(
    correlationId: string,
    result: CommandResultType,
    params?: OcpiParams,
  ) {
    try {
      const response = await this.asyncResponder.send(
        correlationId,
        {
          result: result,
        } as CommandResult,
          params,
      );
      console.log('Async response: ', response);
    } catch (e) {
      console.error(e);
    }
  }
}
