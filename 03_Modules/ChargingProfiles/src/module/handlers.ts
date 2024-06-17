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
  IMessageSender, RequestStartStopStatusEnumType, RequestStartTransactionResponse, RequestStopTransactionResponse,
  SystemConfig,
} from '@citrineos/base';
import {RabbitMqReceiver, RabbitMqSender, Timer,} from '@citrineos/util';
import deasyncPromise from 'deasync-promise';
import {ILogObj, Logger} from 'tslog';
import {CommandsClientApi, ResponseUrlRepository} from "@citrineos/ocpi-base";
import {Service} from "typedi";
import {CommandResultType} from "@citrineos/ocpi-base/dist/model/CommandResult";
import {ChargingProfilesModule} from "../index";

/**
 * Component that handles ChargingProfiles related messages.
 */
@Service()
export class ChargingProfilesOcppHandlers extends AbstractModule {
  /**
   * Fields
   */
  protected _requests: CallAction[] = [
  ];
  protected _responses: CallAction[] = [
  ];

  constructor(
    config: SystemConfig,
    cache: ICache,
    readonly responseUrlRepo: ResponseUrlRepository,
    readonly commandsClient: CommandsClientApi,
    sender?: IMessageSender,
    handler?: IMessageHandler,
    logger?: Logger<ILogObj>,
  ) {
    super(
      config,
      cache,
      handler || new RabbitMqReceiver(config, logger),
      sender || new RabbitMqSender(config, logger),
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
  protected _handleRequestStartTransactionResponse(
      message: IMessage<RequestStartTransactionResponse>,
      props?: HandlerProperties,
  ): void {
    this._logger.debug('Handling:', message, props);

    const result = this.getResult(message.payload.status);

    this.sendCommandResult(message.context.correlationId, result);
  }

  @AsHandler(CallAction.RequestStopTransaction)
  protected _handleRequestStopTransactionResponse(
      message: IMessage<RequestStopTransactionResponse>,
      props?: HandlerProperties,
  ): void {
    this._logger.debug('Handling:', message, props);

    const result = this.getResult(message.payload.status);

    this.sendCommandResult(message.context.correlationId, result);
  }

  private getResult(requestStartStopStatus: RequestStartStopStatusEnumType): CommandResultType {
    switch (requestStartStopStatus) {
      case RequestStartStopStatusEnumType.Accepted:
        return CommandResultType.ACCEPTED;
      case RequestStartStopStatusEnumType.Rejected:
        return CommandResultType.REJECTED;
      default:
        throw new Error(`Unknown RequestStartStopStatusEnumType: ${requestStartStopStatus}`);
    }
  }

  private async sendCommandResult(correlationId: string, result: CommandResultType) {
    const responseUrlEntity = await this.responseUrlRepo.getResponseUrl(correlationId);
    if (responseUrlEntity) {
      try {
        await this.commandsClient.postCommandResult(responseUrlEntity.responseUrl, {
          result: result,
        })
      } catch (error) {
        this._logger.error(error);
      }
    }
  }
}