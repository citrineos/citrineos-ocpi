// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import {
  AbstractModule,
  AsHandler,
  CallAction,
  ChargingProfileStatusEnumType,
  ClearChargingProfileResponse,
  ClearChargingProfileStatusEnumType,
  CompositeScheduleType,
  EventGroup,
  GenericStatusEnumType,
  GetCompositeScheduleResponse,
  HandlerProperties,
  ICache,
  IMessage,
  IMessageHandler,
  IMessageSender,
  SystemConfig,
  SetChargingProfileResponse,
} from '@citrineos/base';
import { RabbitMqReceiver, RabbitMqSender, Timer } from '@citrineos/util';
import deasyncPromise from 'deasync-promise';
import { ILogObj, Logger } from 'tslog';
import {
  ActiveChargingProfileResult,
  AsyncResponder,
  ChargingProfileResultType,
} from '@citrineos/ocpi-base';
import { Service } from 'typedi';
import { ClearChargingProfileResult } from '@citrineos/ocpi-base';
import { ActiveChargingProfile } from '../../../../00_Base/src/model/ActiveChargingProfile';
import { ChargingProfileResult } from '../../../../00_Base/src';

@Service()
export class ChargingProfilesOcppHandlers extends AbstractModule {
  /**
   * Fields
   */
  protected _requests: CallAction[] = [];
  protected _responses: CallAction[] = [
    CallAction.GetCompositeSchedule,
    CallAction.ClearChargingProfile,
    CallAction.SetChargingProfile,
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

    try {
      await this.asyncResponder.send(message.context.correlationId, {
        result: this.getResult(message.payload.status),
        profile: message.payload.schedule
          ? this.mapOcppScheduleToOcpi(message.payload.schedule)
          : undefined,
      } as ActiveChargingProfileResult);
    } catch (e) {
      console.error(e);
    }
  }

  @AsHandler(CallAction.ClearChargingProfile)
  protected async _handleClearChargingProfileResponse(
    message: IMessage<ClearChargingProfileResponse>,
    props?: HandlerProperties,
  ): Promise<void> {
    this._logger.debug('Handling:', message, props);

    try {
      await this.asyncResponder.send(message.context.correlationId, {
        result: this.getResult(message.payload.status),
      } as ClearChargingProfileResult);
    } catch (e) {
      console.error(e);
    }
  }

  @AsHandler(CallAction.SetChargingProfile)
  protected async _handleSetChargingProfileResponse(
    message: IMessage<SetChargingProfileResponse>,
    props?: HandlerProperties,
  ): Promise<void> {
    this._logger.debug('Handling:', message, props);

    try {
      await this.asyncResponder.send(message.context.correlationId, {
        result: this.getResult(message.payload.status),
      } as ChargingProfileResult);
    } catch (e) {
      console.error(e);
    }
  }

  private getResult(
    status:
      | GenericStatusEnumType
      | ClearChargingProfileStatusEnumType
      | ChargingProfileStatusEnumType,
  ): ChargingProfileResultType {
    switch (status) {
      case GenericStatusEnumType.Accepted:
      case ClearChargingProfileStatusEnumType.Accepted:
      case ChargingProfileStatusEnumType.Accepted:
        return ChargingProfileResultType.ACCEPTED;
      case GenericStatusEnumType.Rejected:
      case ChargingProfileStatusEnumType.Rejected:
        return ChargingProfileResultType.REJECTED;
      case ClearChargingProfileStatusEnumType.Unknown:
        return ChargingProfileResultType.UNKNOWN;
      default:
        throw new Error(`Unknown status: ${status}`);
    }
  }

  private mapOcppScheduleToOcpi(
    schedule: CompositeScheduleType,
  ): ActiveChargingProfile {
    return {
      start_date_time: new Date(schedule.scheduleStart),
      charging_profile: {
        start_date_time: new Date(schedule.scheduleStart),
        duration: schedule.duration,
        charging_rate_unit: schedule.chargingRateUnit,
        charging_profile_period: schedule.chargingSchedulePeriod.map(
          (period) => ({
            start_period: period.startPeriod,
            limit: period.limit,
          }),
        ),
      },
    };
  }
}
