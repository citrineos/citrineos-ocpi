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
  MessageOrigin,
  SystemConfig,
  OCPP2_0_1,
  OCPP2_0_1_CallAction,
  OCPPVersion,
} from '@citrineos/base';
import { RabbitMqReceiver, RabbitMqSender } from '@citrineos/util';
import deasyncPromise from 'deasync-promise';
import { ILogObj, Logger } from 'tslog';
import { Timer } from '../../../../00_Base/src/util/Timer';
import {
  ActiveChargingProfile,
  ActiveChargingProfileResult,
  AsyncResponder,
  buildPutChargingProfileParams,
  ChargingProfileResult,
  ChargingProfileResultType,
  ChargingProfilesClientApi,
  ClearChargingProfileResult,
  ClientInformationRepository,
  EndpointRepository,
  SessionChargingProfileRepository,
  SessionMapper,
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

  protected _requests: OCPP2_0_1_CallAction[] = [
    OCPP2_0_1_CallAction.NotifyEVChargingSchedule,
    OCPP2_0_1_CallAction.NotifyChargingLimit,
    OCPP2_0_1_CallAction.TransactionEvent,
  ];
  protected _responses: OCPP2_0_1_CallAction[] = [
    OCPP2_0_1_CallAction.GetCompositeSchedule,
    OCPP2_0_1_CallAction.ClearChargingProfile,
    OCPP2_0_1_CallAction.SetChargingProfile,
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
    readonly sessionMapper: SessionMapper,
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

    this.initHandlers();

    this._logger.info(`Initialized in ${timer.end()}ms...`);
  }

  @AsHandler(OCPPVersion.OCPP2_0_1, OCPP2_0_1_CallAction.GetCompositeSchedule)
  protected async _handleGetCompositeScheduleResponse(
    message: IMessage<OCPP2_0_1.GetCompositeScheduleResponse>,
    props?: HandlerProperties,
  ): Promise<void> {
    this._logger.debug('Handling:', message, props);

    const response = message.payload as OCPP2_0_1.GetCompositeScheduleResponse;
    const ocppSchedule = response.schedule;
    const ocpiSchedule = ocppSchedule
      ? this.mapOcppScheduleToOcpi(ocppSchedule)
      : undefined;
    try {
      await this.asyncResponder.send(message.context.correlationId, {
        result: this.getResult(message.payload.status),
        profile: ocpiSchedule,
      } as ActiveChargingProfileResult);
    } catch (e) {
      if (e instanceof NotFoundError) {
        if (ocppSchedule && ocpiSchedule) {
          await this.pushChargingProfile(
            message.context.stationId,
            ocppSchedule.evseId,
            ocpiSchedule,
          );
        }
      } else {
        this._logger.error(e);
      }
    }
  }

  @AsHandler(OCPPVersion.OCPP2_0_1, OCPP2_0_1_CallAction.ClearChargingProfile)
  protected async _handleClearChargingProfileResponse(
    message: IMessage<OCPP2_0_1.ClearChargingProfileResponse>,
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
        status === OCPP2_0_1.ClearChargingProfileStatusEnumType.Accepted
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
              OCPPVersion.OCPP2_0_1,
              OCPP2_0_1_CallAction.GetCompositeSchedule,
              {
                duration: this.COMPOSITE_SCHEDULE_DURATION,
                evseId: evseId,
              } as OCPP2_0_1.GetCompositeScheduleRequest,
              undefined,
              uuidv4(),
              MessageOrigin.ChargingStationManagementSystem,
            );
          }
        }
      }
    }
  }

  @AsHandler(OCPPVersion.OCPP2_0_1, OCPP2_0_1_CallAction.SetChargingProfile)
  protected async _handleSetChargingProfileResponse(
    message: IMessage<OCPP2_0_1.SetChargingProfileResponse>,
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
        status === OCPP2_0_1.ChargingProfileStatusEnumType.Accepted
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
              OCPPVersion.OCPP2_0_1,
              OCPP2_0_1_CallAction.GetCompositeSchedule,
              {
                duration: this.COMPOSITE_SCHEDULE_DURATION,
                evseId: evseId,
              } as OCPP2_0_1.GetCompositeScheduleRequest,
              undefined,
              uuidv4(),
              MessageOrigin.ChargingStationManagementSystem,
            );
          }
        }
      }
    }
  }

  @AsHandler(
    OCPPVersion.OCPP2_0_1,
    OCPP2_0_1_CallAction.NotifyEVChargingSchedule,
  )
  protected async _handleNotifyEVChargingScheduleRequest(
    message: IMessage<OCPP2_0_1.NotifyEVChargingScheduleRequest>,
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
        OCPPVersion.OCPP2_0_1,
        OCPP2_0_1_CallAction.GetCompositeSchedule,
        {
          duration: this.COMPOSITE_SCHEDULE_DURATION,
          evseId: message.payload.evseId,
        } as OCPP2_0_1.GetCompositeScheduleRequest,
        undefined,
        uuidv4(),
        MessageOrigin.ChargingStationManagementSystem,
      );
    }
  }

  @AsHandler(OCPPVersion.OCPP2_0_1, OCPP2_0_1_CallAction.NotifyChargingLimit)
  protected async _handleNotifyChargingLimitRequest(
    message: IMessage<OCPP2_0_1.NotifyChargingLimitRequest>,
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
          OCPPVersion.OCPP2_0_1,
          OCPP2_0_1_CallAction.GetCompositeSchedule,
          {
            duration: this.COMPOSITE_SCHEDULE_DURATION,
            evseId: message.payload.evseId,
          } as OCPP2_0_1.GetCompositeScheduleRequest,
          undefined,
          uuidv4(),
          MessageOrigin.ChargingStationManagementSystem,
        );
      }
    }
  }

  @AsHandler(OCPPVersion.OCPP2_0_1, OCPP2_0_1_CallAction.TransactionEvent)
  protected async _handleTransactionEventRequest(
    message: IMessage<OCPP2_0_1.TransactionEventRequest>,
    props?: HandlerProperties,
  ): Promise<void> {
    this._logger.debug('Handling:', message, props);
    const request = message.payload;
    const stationId = message.context.stationId;
    const transactionId = request.transactionInfo.transactionId;

    if (
      request.triggerReason ===
      OCPP2_0_1.TriggerReasonEnumType.ChargingRateChanged
    ) {
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
            OCPPVersion.OCPP2_0_1,
            OCPP2_0_1_CallAction.GetCompositeSchedule,
            {
              duration: this.COMPOSITE_SCHEDULE_DURATION,
              evseId: evseId,
            } as OCPP2_0_1.GetCompositeScheduleRequest,
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
      | OCPP2_0_1.GenericStatusEnumType
      | OCPP2_0_1.ClearChargingProfileStatusEnumType
      | OCPP2_0_1.ChargingProfileStatusEnumType,
  ): ChargingProfileResultType {
    switch (status) {
      case OCPP2_0_1.GenericStatusEnumType.Accepted:
      case OCPP2_0_1.ClearChargingProfileStatusEnumType.Accepted:
      case OCPP2_0_1.ChargingProfileStatusEnumType.Accepted:
        return ChargingProfileResultType.ACCEPTED;
      case OCPP2_0_1.GenericStatusEnumType.Rejected:
      case OCPP2_0_1.ChargingProfileStatusEnumType.Rejected:
        return ChargingProfileResultType.REJECTED;
      case OCPP2_0_1.ClearChargingProfileStatusEnumType.Unknown:
        return ChargingProfileResultType.UNKNOWN;
      default:
        throw new Error(`Unknown status: ${status}`);
    }
  }

  private mapOcppScheduleToOcpi(
    schedule: OCPP2_0_1.CompositeScheduleType,
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
    stationId: string,
    evseId: number,
    profileResult: ActiveChargingProfile,
  ) {
    const activeTransaction =
      await this.transactionEventRepository.getActiveTransactionByStationIdAndEvseId(
        stationId,
        evseId,
      );
    if (!activeTransaction) {
      throw new NotFoundError(
        `No active transaction found for station ${stationId} and evse ${evseId}`,
      );
    }
    const session = (
      await this.sessionMapper.mapTransactionsToSessions([activeTransaction])
    )[0];
    if (!session) {
      throw new NotFoundError(
        `Mapping session failed for transaction ${activeTransaction.transactionId}`,
      );
    }

    try {
      const params = buildPutChargingProfileParams(
        session.id,
        profileResult,
        session.country_code,
        session.party_id,
        session.cdr_token.country_code,
        session.cdr_token.party_id,
      );
      const response = await this.client.putChargingProfile(params);
      this._logger.info(
        `Pushed charging profile with response: ${JSON.stringify(response)}`,
      );
    } catch (e) {
      this._logger.error(
        `Push charging profile failed for station ${stationId} and evse ${evseId}: ${JSON.stringify(e)}`,
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
      const existingSchedule =
        await this.sessionChargingProfileRepository.existByQuery({
          where: {
            sessionId: activeTransactionId,
          },
        });
      return existingSchedule > 0;
    }

    return false;
  }
}
