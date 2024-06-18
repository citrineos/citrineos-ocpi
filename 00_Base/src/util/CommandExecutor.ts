import { StartSession } from '../model/StartSession';
import {
  AbstractModule,
  CallAction,
  GetCompositeScheduleRequest,
  IdTokenEnumType,
  MessageOrigin,
  RequestStartTransactionRequest,
  RequestStopTransactionRequest,
  ReserveNowRequest,
} from '@citrineos/base';
import {Service} from "typedi";
import {ResponseUrlRepository} from "../repository/response-url.repository";
import {v4 as uuidv4} from 'uuid';
import {StopSession} from "../model/StopSession";
import {NotFoundException} from "../exception/not.found.exception";
import {ReserveNow} from "../model/ReserveNow";
import {CancelReservation} from "../model/CancelReservation";
import {OcpiEvseEntityRepository} from "../repository/ocpi-evse.repository";
import {SequelizeTransactionEventRepository} from "@citrineos/data";
import {SetChargingProfile} from "../model/SetChargingProfile";
import {BadRequestError} from "routing-controllers";
import {
    ChargingProfileKindEnumType,
    ChargingProfilePurposeEnumType, ChargingProfileType,
    ChargingSchedulePeriodType, ChargingScheduleType, SetChargingProfileRequest
} from "@citrineos/base";

@Service()
export class CommandExecutor {
  constructor(
    readonly abstractModule: AbstractModule,
    readonly responseUrlRepo: ResponseUrlRepository,
    readonly ocpiEvseEntityRepo: OcpiEvseEntityRepository,
    readonly transactionRepo: SequelizeTransactionEventRepository,
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

  public async executeReserveNow(reserveNow: ReserveNow) {
    // TODO: update to handle optional evse uid.
    const evse = await this.ocpiEvseEntityRepo.findByUid(reserveNow.evse_uid!);

    if (!evse) {
      throw new NotFoundException('EVSE not found');
    }

    const correlationId = uuidv4();
    const responseUrlEntity = await this.responseUrlRepo.saveResponseUrl(
      correlationId,
      reserveNow.response_url,
    );

    const request = {
      id: parseInt(reserveNow.reservation_id),
      expiryDateTime: reserveNow.expiry_date.toDateString(),
      idToken: {
        idToken: reserveNow.token.contract_id,
        type: IdTokenEnumType.eMAID,
      },
      evseId: reserveNow.evse_uid,
    } as ReserveNowRequest;

    this.abstractModule.sendCall(
      evse.chargingStationId,
      'tenantId',
      CallAction.ReserveNow,
      request,
      undefined,
      correlationId,
      MessageOrigin.CentralSystem,
    );
  }

  public async executeCancelReservation(cancelReservation: CancelReservation) {
    // TODO: implement.
  }

  public async executeGetActiveChargingProfile(
    sessionId: string,
    duration: number,
    responseUrl: string,
  ) {
    const transaction =
      await this.transactionRepo.findByTransactionId(sessionId);

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
            "tenantId",
            CallAction.GetCompositeSchedule,
            request,
            undefined,
            correlationId,
            MessageOrigin.CentralSystem
        );
    }

    public async executePutChargingProfile(sessionId: string, setChargingProfile: SetChargingProfile) {
        // TODO: find station id by session id when session and location module is implemented
        const stationId = "cp001";
        const transaction = await this.transactionRepo.readTransactionByStationIdAndTransactionId(stationId,sessionId);

        if (!transaction) {
            throw new NotFoundException("Session not found");
        }

        console.log(`Found transaction: ${JSON.stringify(transaction)}`);

        const evseId = transaction.evse?.id;

        const correlationId = uuidv4();
        await this.responseUrlRepo.saveResponseUrl(correlationId, setChargingProfile.response_url);

        this.abstractModule.sendCall(
            stationId,
            "tenantId",
            CallAction.SetChargingProfile,
            this.mapSetChargingProfileRequest(setChargingProfile, evseId!, sessionId),
            undefined,
            correlationId,
            MessageOrigin.CentralSystem
        );
    }

    private mapSetChargingProfileRequest(setChargingProfile: SetChargingProfile, evseId: number, sessionId: string): SetChargingProfileRequest {
        const startDateTime = setChargingProfile.charging_profile.start_date_time;
        const duration = setChargingProfile.charging_profile.duration;
        let endDateTime;
        if (startDateTime && duration) {
            endDateTime = startDateTime;
            endDateTime.setSeconds(endDateTime.getSeconds() + duration);
        }

        // Charging profile periods are required in OCPP SetChargingProfileRequest
        if (!setChargingProfile.charging_profile.charging_profile_period) {
            throw new BadRequestError("Validation failed: Missing charging_profile_period");
        }
        const chargingProfilePeriods: ChargingSchedulePeriodType[] = [];
        for (const chargingProfilePeriod of setChargingProfile.charging_profile.charging_profile_period) {
            chargingProfilePeriods.push({
                startPeriod: chargingProfilePeriod.start_period,
                limit: chargingProfilePeriod.limit
            });
        }

        const chargingSchedule = {
            id: 1, // TODO: tbd
            startSchedule: startDateTime?.toISOString(),
            duration: duration,
            chargingRateUnit: setChargingProfile.charging_profile.charging_rate_unit.toUpperCase(),
            minChargingRate: setChargingProfile.charging_profile.min_charging_rate,
            chargingSchedulePeriod: chargingProfilePeriods
        } as ChargingScheduleType;

        return {
            evseId,
            chargingProfile: {
                id: 1, // TODO: tbd
                stackLevel: 0,
                chargingProfilePurpose: ChargingProfilePurposeEnumType.TxProfile,
                chargingProfileKind: startDateTime ? ChargingProfileKindEnumType.Absolute : ChargingProfileKindEnumType.Relative,
                validFrom: startDateTime?.toISOString(),
                validTo:endDateTime?.toISOString(),
                chargingSchedule: [chargingSchedule],
                transactionId: sessionId
            } as ChargingProfileType,
        } as SetChargingProfileRequest;
    }
}
