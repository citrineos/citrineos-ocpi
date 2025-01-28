// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import {
  AbstractModule,
  AsHandler,
  EventGroup,
  HandlerProperties,
  ICache,
  IMessage,
  IMessageHandler,
  IMessageSender,
  OCPP2_0_1,
  SystemConfig,
  OCPP2_0_1_CallAction,
  OCPPVersion,
} from '@citrineos/base';
import { RabbitMqReceiver, RabbitMqSender } from '@citrineos/util';
import deasyncPromise from 'deasync-promise';
import { ILogObj, Logger } from 'tslog';
import {
  AsyncResponder,
  CommandResult,
  CommandResultType,
  OcpiParams,
  Session,
  SessionMapper,
} from '@citrineos/ocpi-base';
import { Service } from 'typedi';
import { SequelizeTransactionEventRepository } from '@citrineos/data';
import { Timer } from '../../../../00_Base/src/util/Timer';

/**
 * Component that handles provisioning related messages.
 */
@Service()
export class CommandsOcppHandlers extends AbstractModule {
  /**
   * Fields
   */
  protected _requests: OCPP2_0_1_CallAction[] = [];
  protected _responses: OCPP2_0_1_CallAction[] = [
    OCPP2_0_1_CallAction.RequestStartTransaction,
    OCPP2_0_1_CallAction.RequestStopTransaction,
    OCPP2_0_1_CallAction.CancelReservation,
    OCPP2_0_1_CallAction.ReserveNow,
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

    this.initHandlers();

    this._logger.info(`Initialized in ${timer.end()}ms...`);
  }

  @AsHandler(
    OCPPVersion.OCPP2_0_1,
    OCPP2_0_1_CallAction.RequestStartTransaction,
  )
  protected async _handleRequestStartTransactionResponse(
    message: IMessage<OCPP2_0_1.RequestStartTransactionResponse>,
    props?: HandlerProperties,
  ): Promise<void> {
    this._logger.debug('Handling RequestStartTransaction:', message, props);

    const result = this.getResult(message.payload.status);

    let session: Session | undefined;
    if (message.payload.transactionId) {
      const transaction =
        await this.transactionEventRepository.findByTransactionId(
          message.payload.transactionId,
        );
      if (transaction) {
        session = (
          await this.sessionMapper.mapTransactionsToSessions([transaction])
        )[0];
      }
    }
    if (!session) {
      throw new Error('Session not found');
    }

    this.sendCommandResult(
      message.context.correlationId,
      result,
      new OcpiParams(
        session.country_code,
        session.party_id,
        session.cdr_token.country_code,
        session.cdr_token.party_id,
      ),
    );
  }

  @AsHandler(OCPPVersion.OCPP2_0_1, OCPP2_0_1_CallAction.RequestStopTransaction)
  protected _handleRequestStopTransactionResponse(
    message: IMessage<OCPP2_0_1.RequestStopTransactionResponse>,
    props?: HandlerProperties,
  ): void {
    this._logger.debug('Handling RequestStopTransaction:', message, props);

    const result = this.getResult(message.payload.status);

    this.sendCommandResult(message.context.correlationId, result);
  }

  @AsHandler(OCPPVersion.OCPP2_0_1, OCPP2_0_1_CallAction.ReserveNow)
  protected async _handleReserveNowResponse(
    message: IMessage<OCPP2_0_1.ReserveNowResponse>,
    props?: HandlerProperties,
  ): Promise<void> {
    this._logger.debug('Handling ReserveNowResponse:', message, props);

    const result = this.getResult(message.payload.status);

    this.sendCommandResult(message.context.correlationId, result);
  }

  @AsHandler(OCPPVersion.OCPP2_0_1, OCPP2_0_1_CallAction.CancelReservation)
  protected async _handleCancelReservationResponse(
    message: IMessage<OCPP2_0_1.CancelReservationResponse>,
    props?: HandlerProperties,
  ): Promise<void> {
    this._logger.debug('Handling CancelReservationResponse:', message, props);

    const result = this.getResult(message.payload.status);

    this.sendCommandResult(message.context.correlationId, result);
  }

  private getResult(
    responseStatus:
      | OCPP2_0_1.RequestStartStopStatusEnumType
      | OCPP2_0_1.ReserveNowStatusEnumType
      | OCPP2_0_1.CancelReservationStatusEnumType,
  ): CommandResultType {
    switch (responseStatus) {
      case OCPP2_0_1.RequestStartStopStatusEnumType.Accepted:
      case OCPP2_0_1.ReserveNowStatusEnumType.Accepted:
      case OCPP2_0_1.CancelReservationStatusEnumType.Accepted:
        return CommandResultType.ACCEPTED;
      case OCPP2_0_1.RequestStartStopStatusEnumType.Rejected:
      case OCPP2_0_1.ReserveNowStatusEnumType.Rejected:
      case OCPP2_0_1.CancelReservationStatusEnumType.Rejected:
        return CommandResultType.REJECTED;
      default:
        throw new Error(`Unknown ResponseStatusEnumType: ${responseStatus}`);
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
