import { StartSession } from '../model/StartSession';
import {
  AbstractModule,
  CallAction,
  ChargingProfileKindEnumType,
  ChargingProfilePurposeEnumType,
  ChargingProfileType,
  ChargingScheduleType,
  ClearChargingProfileRequest,
  GetCompositeScheduleRequest,
  IdTokenEnumType,
  MessageOrigin,
  RequestStartTransactionRequest,
  RequestStopTransactionRequest,
  SetChargingProfileRequest,
} from '@citrineos/base';
import { Service } from 'typedi';
import { ResponseUrlRepository } from '../repository/response.url.repository';
import { v4 as uuidv4 } from 'uuid';
import { StopSession } from '../model/StopSession';
import { NotFoundException } from '../exception/NotFoundException';
import { OcpiEvseEntityRepository } from '../repository/ocpi.evse.repository';
import {
  SequelizeChargingProfileRepository,
  SequelizeTransactionEventRepository,
} from '@citrineos/data';
import { SetChargingProfile } from '../model/SetChargingProfile';
import { BadRequestError } from 'routing-controllers';
import { ChargingProfile } from '../model/ChargingProfile';
import {SessionChargingProfileRepository} from "../repository/SessionChargingProfileRepository";

@Service()
export class CommandExecutor {
  constructor(
    readonly abstractModule: AbstractModule,
    readonly responseUrlRepo: ResponseUrlRepository,
    readonly ocpiEvseEntityRepo: OcpiEvseEntityRepository,
    readonly sessionChargingProfileRepo: SessionChargingProfileRepository,
    readonly transactionRepo: SequelizeTransactionEventRepository,
    readonly chargingProfileRepo: SequelizeChargingProfileRepository,
  ) {}

  public async executeStartSession(startSession: StartSession): Promise<void> {
    // TODO: update to handle optional evse uid.
    const evse = await this.ocpiEvseEntityRepo.findByUid(
      startSession.evse_uid!,
    );

    if (!evse) {
      throw new NotFoundException('EVSE not found');
    }

    const correlationId = uuidv4();
    const responseUrlEntity = await this.responseUrlRepo.saveResponseUrl(
      correlationId,
      startSession.response_url,
    );

    const request = {
      remoteStartId: responseUrlEntity.id,
      idToken: {
        idToken: startSession.token.contract_id,
        type: IdTokenEnumType.eMAID,
      },
    } as RequestStartTransactionRequest;

    this.abstractModule.sendCall(
      evse.chargingStationId,
      'tenantId',
      CallAction.RequestStartTransaction,
      request,
      undefined,
      correlationId,
      MessageOrigin.CentralSystem,
    );
  }

  public async executeStopSession(stopSession: StopSession): Promise<void> {
    const transaction = await this.transactionRepo.findByTransactionId(
      stopSession.session_id,
    );

    if (!transaction) {
      throw new NotFoundException('Session not found');
    }

    const correlationId = uuidv4();

    await this.responseUrlRepo.saveResponseUrl(
      correlationId,
      stopSession.response_url,
    );

    const request = {
      transactionId: stopSession.session_id,
    } as RequestStopTransactionRequest;

    this.abstractModule.sendCall(
      transaction.stationId,
      'tenantId',
      CallAction.RequestStopTransaction,
      request,
      undefined,
      correlationId,
      MessageOrigin.CentralSystem,
    );
  }

  public async executeGetActiveChargingProfile(
      sessionId: string,
      duration: number,
      responseUrl: string,
  ) {
    // const transaction =
    //   await this.transactionRepo.findByTransactionId(sessionId);

    const transaction = {
      stationId: 'CS01',
      evse: {
        id: 1,
      },
    };

    if (!transaction) {
      throw new NotFoundException('Session not found');
    }

    const correlationId = uuidv4();

    await this.responseUrlRepo.saveResponseUrl(correlationId, responseUrl);

    const request = {
      duration: duration,
      evseId: transaction.evse?.id,
    } as GetCompositeScheduleRequest;

    this.abstractModule.sendCall(
        transaction.stationId,
        'tenantId',
        CallAction.GetCompositeSchedule,
        request,
        undefined,
        correlationId,
        MessageOrigin.CentralSystem,
    );
  }

  public async executeClearChargingProfile(
      sessionId: string,
      responseUrl: string,
  ) {
    // const transaction =
    //   await this.transactionRepo.findByTransactionId(sessionId);

    const transaction = {
      stationId: 'CS01',
      evse: {
        id: 1,
      },
    };

    if (!transaction) {
      throw new NotFoundException('Session not found');
    }

    // TODO: fetch chargingProfileId

    const correlationId = uuidv4();

    await this.responseUrlRepo.saveResponseUrl(correlationId, responseUrl);

    const request = {
      // TODO: use chargingProfileId from transaction
      chargingProfileId: 1,
    } as ClearChargingProfileRequest;

    this.abstractModule.sendCall(
        transaction.stationId,
        'tenantId',
        CallAction.ClearChargingProfile,
        request,
        undefined,
        correlationId,
        MessageOrigin.CentralSystem,
    );
  }

  public async executePutChargingProfile(
    sessionId: string,
    setChargingProfile: SetChargingProfile,
  ) {
    // TODO: find a way to get station id and remove the mock data below
    const stationId = 'cp001';
    // TODO: find a way to map sessionId to transactionId and use transactionId in the db query
    const transaction =
      await this.transactionRepo.readTransactionByStationIdAndTransactionId(
        stationId,
        sessionId,
      );

    if (!transaction) {
      throw new NotFoundException('Session not found');
    }
    console.log(`Found transaction: ${JSON.stringify(transaction)}`);

    if (!transaction.evse) {
      throw new NotFoundException('Evse not found');
    }
    const evseId = transaction.evse.id;

    const correlationId = uuidv4();
    await this.responseUrlRepo.saveResponseUrl(
      correlationId,
      setChargingProfile.response_url,
    );

    const setChargingProfileRequest = await this.mapSetChargingProfileRequest(
      setChargingProfile.charging_profile,
      evseId,
      sessionId,
      stationId,
    );
    await this.chargingProfileRepo.createOrUpdateChargingProfile(
      setChargingProfileRequest.chargingProfile,
      stationId,
      evseId,
    );
    await this.sessionChargingProfileRepo.createOrUpdateSessionChargingProfile(
        sessionId,
        setChargingProfileRequest.chargingProfile.id,
        setChargingProfileRequest.chargingProfile.chargingSchedule[0].id
    );

    this.abstractModule.sendCall(
      stationId,
      'tenantId',
      CallAction.SetChargingProfile,
      setChargingProfileRequest,
      undefined,
      correlationId,
      MessageOrigin.CentralSystem,
    );
  }

  public async executeGetCompositeProfile(
      evseId: number,
      stationId: string,
      duration: number,
      correlationId: string,
  ): Promise<void> {
    const request = {
      duration: duration,
      evseId: evseId,
    } as GetCompositeScheduleRequest;

    this.abstractModule.sendCall(
        stationId,
        'tenantId',
        CallAction.GetCompositeSchedule,
        request,
        undefined,
        correlationId,
        MessageOrigin.CentralSystem,
    );
  }

  private async mapSetChargingProfileRequest(
    chargingProfile: ChargingProfile,
    evseId: number,
    sessionId: string,
    stationId: string,
  ): Promise<SetChargingProfileRequest> {
    const startDateTime = chargingProfile.start_date_time
      ? new Date(chargingProfile.start_date_time)
      : undefined;
    const duration = chargingProfile.duration;
    let endDateTime;
    if (startDateTime && duration) {
      endDateTime = new Date(startDateTime);
      endDateTime.setSeconds(endDateTime.getSeconds() + duration);
    }

    // Charging profile periods are required in OCPP SetChargingProfileRequest
    if (!chargingProfile.charging_profile_period) {
      throw new BadRequestError(
        'Validation failed: Missing charging_profile_period',
      );
    }

    const scheduleId =
      await this.chargingProfileRepo.getNextChargingScheduleId(stationId);
    const chargingSchedule = {
      id: scheduleId,
      startSchedule: startDateTime?.toISOString(),
      duration: duration,
      chargingRateUnit: chargingProfile.charging_rate_unit.toUpperCase(),
      minChargingRate: chargingProfile.min_charging_rate,
      chargingSchedulePeriod: chargingProfile.charging_profile_period.map(
        (period) => ({
          startPeriod: period.start_period,
          limit: period.limit,
        }),
      ),
    } as ChargingScheduleType;

    const profileId = await this.chargingProfileRepo.readNextId('id', {
      where: { stationId: stationId },
    });
    const setChargingProfileRequest = {
      evseId,
      chargingProfile: {
        id: profileId,
        stackLevel: 0,
        chargingProfilePurpose: ChargingProfilePurposeEnumType.TxProfile,
        chargingProfileKind: startDateTime
          ? ChargingProfileKindEnumType.Absolute
          : ChargingProfileKindEnumType.Relative,
        validFrom: startDateTime?.toISOString(),
        validTo: endDateTime?.toISOString(),
        chargingSchedule: [chargingSchedule],
        transactionId: sessionId,
      } as ChargingProfileType,
    } as SetChargingProfileRequest;

    console.log(
      `Mapped SetChargingProfileRequest: ${JSON.stringify(setChargingProfileRequest)}`,
    );
    return setChargingProfileRequest;
  }
}
