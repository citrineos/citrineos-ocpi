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
  NotifyChargingLimitRequest,
  NotifyEVChargingScheduleRequest,
  SetChargingProfileResponse,
  SystemConfig,
  TransactionEventRequest,
  TriggerReasonEnumType,
} from '@citrineos/base';
import { RabbitMqReceiver, RabbitMqSender, Timer } from '@citrineos/util';
import deasyncPromise from 'deasync-promise';
import { ILogObj, Logger } from 'tslog';
import {
  ActiveChargingProfileResult,
  AsyncResponder,
  ChargingProfileResult,
  ChargingProfileResultType,
  ChargingProfilesService,
  ClearChargingProfileResult,
  ActiveChargingProfile,
} from '@citrineos/ocpi-base';
import { Service } from 'typedi';

@Service()
export class ChargingProfilesOcppHandlers extends AbstractModule {
  /**
   * Fields
   */
  protected _requests: CallAction[] = [
    CallAction.NotifyEVChargingSchedule,
    CallAction.NotifyChargingLimit,
    CallAction.TransactionEvent,
  ];
  protected _responses: CallAction[] = [
    CallAction.GetCompositeSchedule,
    CallAction.ClearChargingProfile,
    CallAction.SetChargingProfile,
  ];

  constructor(
    config: SystemConfig,
    cache: ICache,
    readonly asyncResponder: AsyncResponder,
    readonly service: ChargingProfilesService,
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

    const compositeSchedule = message.payload.schedule;
    const profileResult = compositeSchedule
      ? this.mapOcppScheduleToOcpi(compositeSchedule)
      : undefined;
    try {
      await this.asyncResponder.send(message.context.correlationId, {
        result: this.getResult(message.payload.status),
        profile: profileResult,
      } as ActiveChargingProfileResult);
    } catch (e) {
      console.error(e);
      if (compositeSchedule && profileResult) {
        await this.service.pushChargingProfile(
          compositeSchedule.evseId,
          profileResult,
        );
      }
    }
  }

  @AsHandler(CallAction.ClearChargingProfile)
  protected async _handleClearChargingProfileResponse(
    message: IMessage<ClearChargingProfileResponse>,
    props?: HandlerProperties,
  ): Promise<void> {
    this._logger.debug('Handling:', message, props);
    const status = message.payload.status;

    try {
      await this.asyncResponder.send(message.context.correlationId, {
        result: this.getResult(status),
      } as ClearChargingProfileResult);
    } catch (e) {
      console.error(e);
      // If no response URL is present, i.e., the request is sent by CPO for other reasons
      // send GetCompositeSchedule to all EVSEs for charger
      // since EVSE info is not included in ClearChargingProfile response
      // This needs to be improved when we are able to match the request using response
      if (status === ClearChargingProfileStatusEnumType.Accepted) {
        const stationId = message.context.stationId;
        const evseIds =
          await this.service.getEvseIdsWithActiveTransactionByStationId(
            stationId,
          );
        for (const evseId of evseIds) {
          const existingSchedule: boolean =
            await this.service.checkExistingSchedule(stationId, evseId);
          if (existingSchedule) {
            await this.service.getCompositeSchedules(stationId, evseId);
          }
        }
      }
    }
  }

  @AsHandler(CallAction.SetChargingProfile)
  protected async _handleSetChargingProfileResponse(
    message: IMessage<SetChargingProfileResponse>,
    props?: HandlerProperties,
  ): Promise<void> {
    this._logger.debug('Handling:', message, props);
    const status = message.payload.status;

    try {
      await this.asyncResponder.send(message.context.correlationId, {
        result: this.getResult(status),
      } as ChargingProfileResult);
    } catch (e) {
      console.error(e);
      // If no response URL is present, i.e., the request is sent by CPO for other reasons
      // send GetCompositeSchedule to all EVSEs for charger
      // since EVSE info is not included in SetChargingProfile response
      // This needs to be improved when we are able to match the request and response
      if (status === ChargingProfileStatusEnumType.Accepted) {
        const stationId = message.context.stationId;
        const evseIds =
          await this.service.getEvseIdsWithActiveTransactionByStationId(
            stationId,
          );
        for (const evseId of evseIds) {
          const existingSchedule: boolean =
            await this.service.checkExistingSchedule(stationId, evseId);
          if (existingSchedule) {
            await this.service.getCompositeSchedules(stationId, evseId);
          }
        }
      }
    }
  }

  @AsHandler(CallAction.NotifyEVChargingSchedule)
  protected async _handleNotifyEVChargingScheduleRequest(
    message: IMessage<NotifyEVChargingScheduleRequest>,
    props?: HandlerProperties,
  ): Promise<void> {
    this._logger.debug('Handling:', message, props);

    // TODO: We want to send GetCompositeSchedule only when the schedule in the request is validated
    //  i.e., citrine accepts the schedule.
    //  But NotifyEVChargingSchedule belongs to ISO 15118 based Smart Charging
    //  which has not been implemented yet in core.
    //  After it is implemented,
    //  we need to do the same validation on the schedule here as in the core handler
    //  before sending the getCompositeSchedule call
    const isValidSchedule = true;
    const existingSchedule: boolean = await this.service.checkExistingSchedule(
      message.context.stationId,
      message.payload.evseId,
    );
    if (isValidSchedule && existingSchedule) {
      await this.service.getCompositeSchedules(
        message.context.stationId,
        message.payload.evseId,
      );
    }
  }

  @AsHandler(CallAction.NotifyChargingLimit)
  protected async _handleNotifyChargingLimitRequest(
    message: IMessage<NotifyChargingLimitRequest>,
    props?: HandlerProperties,
  ): Promise<void> {
    this._logger.debug('Handling:', message, props);

    if (message.payload.evseId) {
      const existingSchedule: boolean =
        await this.service.checkExistingSchedule(
          message.context.stationId,
          message.payload.evseId,
        );
      if (existingSchedule) {
        await this.service.getCompositeSchedules(
          message.context.stationId,
          message.payload.evseId,
        );
      }
    }
  }

  @AsHandler(CallAction.TransactionEvent)
  protected async _handleTransactionEventRequest(
    message: IMessage<TransactionEventRequest>,
    props?: HandlerProperties,
  ): Promise<void> {
    this._logger.debug('Handling:', message, props);
    const request = message.payload;
    const stationId = message.context.stationId;
    const transactionId = request.transactionInfo.transactionId;

    if (request.triggerReason === TriggerReasonEnumType.ChargingRateChanged) {
      const existingSchedule: boolean =
        await this.service.checkExistingSchedule(
          stationId,
          request.evse?.id,
          transactionId,
        );
      if (existingSchedule) {
        const evseId = request.evse
          ? request.evse.id
          : await this.service.getEvseIdByStationIdAndTransactionId(
              stationId,
              transactionId,
            );
        if (!evseId) {
          console.error('Failed to get evseId');
        } else {
          await this.service.getCompositeSchedules(
            message.context.stationId,
            evseId,
          );
        }
      }
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
