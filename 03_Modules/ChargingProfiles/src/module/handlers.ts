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
  GetCompositeScheduleRequest,
  GetCompositeScheduleResponse,
  HandlerProperties,
  ICache,
  IMessage,
  IMessageHandler,
  IMessageSender,
  MessageOrigin,
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
  ActiveChargingProfile,
  ActiveChargingProfileResult,
  AsyncResponder,
  buildPutChargingProfileParams,
  ChargingProfileResult,
  ChargingProfileResultType,
  ChargingProfilesClientApi,
  ClearChargingProfileResult,
  ClientInformationProps,
  ClientInformationRepository,
  EndpointRepository,
  InterfaceRole,
  ModuleId,
  SessionChargingProfileRepository,
} from '@citrineos/ocpi-base';
import { Service } from 'typedi';
import { Evse, SequelizeTransactionEventRepository } from '@citrineos/data';
import { v4 as uuidv4 } from 'uuid';
import { NotFoundError } from 'routing-controllers';

@Service()
export class ChargingProfilesOcppHandlers extends AbstractModule {
  /**
   * Fields
   */
  // duration: 3600s. Guide from OCPI 2.2.1: between 5 and 60 minutes.
  readonly COMPOSITE_SCHEDULE_DURATION: number = 60 * 60;

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
    readonly client: ChargingProfilesClientApi,
    readonly transactionEventRepository: SequelizeTransactionEventRepository,
    readonly endpointRepository: EndpointRepository,
    readonly clientInformationRepository: ClientInformationRepository,
    readonly sessionChargingProfileRepository: SessionChargingProfileRepository,
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

    const ocppSchedule = message.payload.schedule;
    const ocpiSchedule = ocppSchedule
      ? this.mapOcppScheduleToOcpi(ocppSchedule)
      : undefined;
    try {
      await this.asyncResponder.send(message.context.correlationId, {
        result: this.getResult(message.payload.status),
        profile: ocpiSchedule,
      } as ActiveChargingProfileResult);
    } catch (e) {
      console.error(e);
      if (ocppSchedule && ocpiSchedule) {
        await this.pushChargingProfile(ocppSchedule.evseId, ocpiSchedule);
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
      if (
        e instanceof NotFoundError &&
        status === ClearChargingProfileStatusEnumType.Accepted
      ) {
        const stationId = message.context.stationId;
        const evseIds =
          await this.transactionEventRepository.getEvseIdsWithActiveTransactionByStationId(
            stationId,
          );
        for (const evseId of evseIds) {
          const existingSchedule: boolean = await this.checkExistingSchedule(
            stationId,
            evseId,
          );
          if (existingSchedule) {
            this.sendCall(
              stationId,
              'tenantId',
              CallAction.GetCompositeSchedule,
              {
                duration: this.COMPOSITE_SCHEDULE_DURATION,
                evseId: evseId,
              } as GetCompositeScheduleRequest,
              undefined,
              uuidv4(),
              MessageOrigin.ChargingStationManagementSystem,
            );
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
      if (
        e instanceof NotFoundError &&
        status === ChargingProfileStatusEnumType.Accepted
      ) {
        const stationId = message.context.stationId;
        const evseIds =
          await this.transactionEventRepository.getEvseIdsWithActiveTransactionByStationId(
            stationId,
          );
        for (const evseId of evseIds) {
          const existingSchedule: boolean = await this.checkExistingSchedule(
            stationId,
            evseId,
          );
          if (existingSchedule) {
            this.sendCall(
              stationId,
              'tenantId',
              CallAction.GetCompositeSchedule,
              {
                duration: this.COMPOSITE_SCHEDULE_DURATION,
                evseId: evseId,
              } as GetCompositeScheduleRequest,
              undefined,
              uuidv4(),
              MessageOrigin.ChargingStationManagementSystem,
            );
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
    const existingSchedule: boolean = await this.checkExistingSchedule(
      message.context.stationId,
      message.payload.evseId,
    );
    if (isValidSchedule && existingSchedule) {
      this.sendCall(
        message.context.stationId,
        'tenantId',
        CallAction.GetCompositeSchedule,
        {
          duration: this.COMPOSITE_SCHEDULE_DURATION,
          evseId: message.payload.evseId,
        } as GetCompositeScheduleRequest,
        undefined,
        uuidv4(),
        MessageOrigin.ChargingStationManagementSystem,
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
      const existingSchedule: boolean = await this.checkExistingSchedule(
        message.context.stationId,
        message.payload.evseId,
      );
      if (existingSchedule) {
        this.sendCall(
          message.context.stationId,
          'tenantId',
          CallAction.GetCompositeSchedule,
          {
            duration: this.COMPOSITE_SCHEDULE_DURATION,
            evseId: message.payload.evseId,
          } as GetCompositeScheduleRequest,
          undefined,
          uuidv4(),
          MessageOrigin.ChargingStationManagementSystem,
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
      const existingSchedule: boolean = await this.checkExistingSchedule(
        stationId,
        request.evse?.id,
        transactionId,
      );
      if (existingSchedule) {
        let evseId;
        if (request.evse) {
          evseId = request.evse.id;
        } else {
          const transaction =
            await this.transactionEventRepository.readTransactionByStationIdAndTransactionId(
              stationId,
              transactionId,
            );
          evseId = transaction?.evse?.id;
        }
        if (!evseId) {
          console.error('Failed to get evseId');
        } else {
          this.sendCall(
            message.context.stationId,
            'tenantId',
            CallAction.GetCompositeSchedule,
            {
              duration: this.COMPOSITE_SCHEDULE_DURATION,
              evseId: evseId,
            } as GetCompositeScheduleRequest,
            undefined,
            uuidv4(),
            MessageOrigin.ChargingStationManagementSystem,
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

  private async pushChargingProfile(
    evseId: number,
    profileResult: ActiveChargingProfile,
  ) {
    // TODO: after Session Module is implemented
    //  (1) find the active session by evseId
    //  (2) find the session object by session id
    //  (3) get the country code and party id from the session and its cdr_token
    const sessionId = '12345';
    const toCountryCode = 'NL';
    const toPartyId = 'EXA';
    const fromCountryCode = 'NL';
    const fromPartyId = 'CPO';
    const url = await this.endpointRepository.readEndpoint(
      toCountryCode,
      toPartyId,
      ModuleId.ChargingProfiles,
      InterfaceRole.RECEIVER,
    );
    console.log(`Found endpointURL: ${url}`);
    const clientInfo =
      await this.clientInformationRepository.getClientInformation(
        fromCountryCode,
        fromPartyId,
        toCountryCode,
        toPartyId,
      );
    if (url && clientInfo) {
      const params = buildPutChargingProfileParams(
        `${url}/${sessionId}`,
        profileResult,
        clientInfo[ClientInformationProps.clientToken],
        fromCountryCode,
        fromPartyId,
        toCountryCode,
        toPartyId,
      );
      const response = await this.client.putChargingProfile(params);
      console.log(
        `Pushed charging profile with response: ${JSON.stringify(response)}`,
      );
    } else {
      console.error(
        `No URL or token found for charging profile with country code ${toCountryCode} and party id ${toPartyId}`,
      );
    }
  }

  private async checkExistingSchedule(
    stationId: string,
    evseId?: number,
    transactionId?: string,
  ): Promise<boolean> {
    if (!evseId && !transactionId) {
      console.error('Missing evseId or transactionId');
      return false;
    }
    let activeTransactionId;
    if (transactionId) {
      activeTransactionId = transactionId;
    } else {
      const activeTransaction = (
        await this.transactionEventRepository.readAllTransactionsByQuery({
          where: {
            stationId: stationId,
            isActive: true,
          },
          include: [
            {
              model: Evse,
              where: {
                id: evseId,
              },
            },
          ],
        })
      )[0];
      activeTransactionId = activeTransaction?.transactionId;
    }

    if (activeTransactionId) {
      // TODO: map transactionId to sessionId after session module is implemented
      const sessionId = activeTransactionId;
      const existingSchedule =
        await this.sessionChargingProfileRepository.existByQuery({
          where: {
            sessionId: sessionId,
          },
        });
      return existingSchedule > 0;
    }

    return false;
  }
}
