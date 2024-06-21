// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import {
  AbstractModule,
  AsHandler,
  CallAction,
  ChargingProfileStatusEnumType,
  EventGroup,
  HandlerProperties,
  ICache,
  IMessage,
  IMessageHandler,
  IMessageSender,
  SetChargingProfileResponse,
  SystemConfig,
} from '@citrineos/base';
import { RabbitMqReceiver, RabbitMqSender, Timer } from '@citrineos/util';
import deasyncPromise from 'deasync-promise';
import { ILogObj, Logger } from 'tslog';
import { ChargingProfilesClientApi, ResponseUrlRepository } from '@citrineos/ocpi-base';
import { Service } from 'typedi';
import { ChargingProfileResultType } from "@citrineos/ocpi-base/dist/model/ChargingProfileResult";

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
      CallAction.SetChargingProfile
  ];

  constructor(
    config: SystemConfig,
    cache: ICache,
    readonly responseUrlRepo: ResponseUrlRepository,
    readonly chargingProfilesClientApi: ChargingProfilesClientApi,
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

  @AsHandler(CallAction.SetChargingProfile)
  protected _handleSetChargingProfileResponse(
      message: IMessage<SetChargingProfileResponse>,
      props?: HandlerProperties,
  ): void {
    this._logger.debug('Handling:', message, props);

    const result = this.getSetChargingProfileResult(message.payload.status);

    this.sendSetChargingProfileResult(message.context.correlationId, result);
  }

  private getSetChargingProfileResult(
      chargingProfileStatus: ChargingProfileStatusEnumType,
  ): ChargingProfileResultType {
    switch (chargingProfileStatus) {
      case ChargingProfileStatusEnumType.Accepted:
        return ChargingProfileResultType.ACCEPTED;
      case ChargingProfileStatusEnumType.Rejected:
        return ChargingProfileResultType.REJECTED;
      default:
        throw new Error(
          `Unknown ChargingProfileStatusEnumType: ${chargingProfileStatus}`,
        );
    }
  }

  private async sendSetChargingProfileResult(
    correlationId: string,
    result: ChargingProfileResultType,
  ) {
    const responseUrlEntity =
      await this.responseUrlRepo.getResponseUrl(correlationId);
    if (responseUrlEntity) {
      try {
        await this.chargingProfilesClientApi.postSetChargingProfileResult(
          responseUrlEntity.responseUrl,
          {
            result: result,
          },
        );
      } catch (error) {
        this._logger.error(error);
      }
    }
  }
}
