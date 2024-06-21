// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import {
  AbstractModule,
  AsHandler,
  CallAction,
  EventGroup, GenericStatusEnumType, GetCompositeScheduleResponse,
  HandlerProperties,
  ICache,
  IMessage,
  IMessageHandler,
  IMessageSender,
  SystemConfig,
} from '@citrineos/base';
import {RabbitMqReceiver, RabbitMqSender, Timer} from '@citrineos/util';
import deasyncPromise from 'deasync-promise';
import {ILogObj, Logger} from 'tslog';
import {AsyncResponder} from '@citrineos/ocpi-base';
import {Service} from 'typedi';
import {ChargingProfileResponseType} from "@citrineos/ocpi-base";

/**
 * Component that handles ChargingProfiles related messages.
 */
@Service()
export class ChargingProfilesOcppHandlers extends AbstractModule {
  /**
   * Fields
   */
  protected _requests: CallAction[] = [];
  protected _responses: CallAction[] = [
      CallAction.GetCompositeSchedule
  ];

  constructor(
    config: SystemConfig,
    cache: ICache,
    readonly asyncResponder: AsyncResponder,
    handler?: IMessageHandler,
    sender?: IMessageSender,
    logger?: Logger<ILogObj>,
  ) {
    super(
      config,
      cache,
      handler || new RabbitMqReceiver(config, logger),
      sender || new RabbitMqSender(config, logger),
      EventGroup.ChargingProfiles,
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

  @AsHandler(CallAction.GetCompositeSchedule)
  protected async _handleGetCompositeScheduleResponse(
      message: IMessage<GetCompositeScheduleResponse>,
      props?: HandlerProperties,
  ): Promise<void> {
    this._logger.debug('Handling:', message, props);

    await this.asyncResponder.sendAsyncResponse(message.context.correlationId, {
      result: this.getResult(message.payload.status),
      profile: ChargingProfileResponseType.ACCEPTED ? this.map(message.payload.schedule) : null
    });
  }

  private getResult(
    status: GenericStatusEnumType,
  ): ChargingProfileResponseType {
    switch (status) {
      case GenericStatusEnumType.Accepted:
        return ChargingProfileResponseType.ACCEPTED;
      case GenericStatusEnumType.Rejected:
        return ChargingProfileResponseType.REJECTED;
      default:
        throw new Error(
          `Unknown ChargingProfileResponseType: ${status}`,
        );
    }
  }
}
