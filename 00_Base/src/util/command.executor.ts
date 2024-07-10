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
  MessageOrigin,
  RequestStartTransactionRequest,
  RequestStopTransactionRequest,
  SetChargingProfileRequest,
} from '@citrineos/base';
import { Service } from 'typedi';
import { ResponseUrlRepository } from '../repository/response.url.repository';
import { v4 as uuidv4 } from 'uuid';
import { StopSession } from '../model/StopSession';
import {
  SequelizeChargingProfileRepository,
  SequelizeTransactionEventRepository,
} from '@citrineos/data';
import { SetChargingProfile } from '../model/SetChargingProfile';
import { BadRequestError, NotFoundError } from 'routing-controllers';
import { ChargingProfile } from '../model/ChargingProfile';
import { SessionChargingProfileRepository } from '../repository/SessionChargingProfileRepository';
import { OcpiEvseRepository } from '../repository/OcpiEvseRepository';
import { OcpiTokensMapper } from '../mapper/OcpiTokensMapper';
import { SessionMapper } from '../mapper/session.mapper';
import { OcpiParams } from '../trigger/util/ocpi.params';

@Service()
export class CommandExecutor {
  constructor(
    readonly abstractModule: AbstractModule,
    readonly responseUrlRepo: ResponseUrlRepository,
    readonly sessionChargingProfileRepo: SessionChargingProfileRepository,
    readonly ocpiEvseEntityRepo: OcpiEvseRepository,
    readonly transactionRepo: SequelizeTransactionEventRepository,
    readonly chargingProfileRepo: SequelizeChargingProfileRepository,
    readonly sessionMapper: SessionMapper,
  ) {}

  public async executeStartSession(startSession: StartSession): Promise<void> {
    // TODO: update to handle optional evse uid.
    const evse = await this.ocpiEvseEntityRepo.getOcpiEvseByEvseUid(
      startSession.evse_uid!,
    );

    if (!evse) {
      throw new NotFoundError('EVSE not found');
    }

    const correlationId = uuidv4();
    const responseUrlEntity = await this.responseUrlRepo.saveResponseUrl(
      correlationId,
      startSession.response_url,
    );

    const request = {
      remoteStartId: responseUrlEntity.id,
      idToken: {
        idToken: startSession.token.uid,
        type: OcpiTokensMapper.mapOcpiTokenTypeToOcppIdTokenType(
          startSession.token.type,
        ),
      },
      evseId: evse.evseId,
    } as RequestStartTransactionRequest;

    await this.abstractModule.sendCall(
      evse.stationId,
      'tenantId',
      CallAction.RequestStartTransaction,
      request,
      undefined,
      correlationId,
      MessageOrigin.ChargingStationManagementSystem,
    );
  }

  public async executeStopSession(stopSession: StopSession): Promise<void> {
    const transaction = await this.transactionRepo.findByTransactionId(
      stopSession.session_id,
    );
    if (!transaction) {
      throw new NotFoundError('Transaction not found');
    }

    const session = (
      await this.sessionMapper.mapTransactionsToSessions([transaction])
    )[0];
    if (!session) {
      throw new NotFoundError('Session not found');
    }

    const correlationId = uuidv4();

    await this.responseUrlRepo.saveResponseUrl(
      correlationId,
      stopSession.response_url,
      new OcpiParams(
        session.country_code,
        session.party_id,
        session.cdr_token.country_code,
        session.cdr_token.party_id,
      ),
    );

    const request = {
      transactionId: stopSession.session_id,
    } as RequestStopTransactionRequest;

    await this.abstractModule.sendCall(
      transaction.stationId,
      'tenantId',
      CallAction.RequestStopTransaction,
      request,
      undefined,
      correlationId,
      MessageOrigin.ChargingStationManagementSystem,
    );
  }

  public async executeGetActiveChargingProfile(
    sessionId: string,
    duration: number,
    responseUrl: string,
  ) {
    // based on the current assumption, transactionId is equal to sessionId
    // If this map assumption changes, this needs to be changed
    const transaction =
      await this.transactionRepo.findByTransactionId(sessionId);
    if (!transaction) {
      throw new NotFoundError('Transaction not found');
    }

    const session = (
      await this.sessionMapper.mapTransactionsToSessions([transaction])
    )[0];
    if (!session) {
      throw new NotFoundError('Session not found');
    }

    const correlationId = uuidv4();

    await this.responseUrlRepo.saveResponseUrl(
      correlationId,
      responseUrl,
      new OcpiParams(
        session.country_code,
        session.party_id,
        session.cdr_token.country_code,
        session.cdr_token.party_id,
      ),
    );

    const request = {
      duration: duration,
      evseId: transaction.evse?.id,
    } as GetCompositeScheduleRequest;

    await this.abstractModule.sendCall(
      transaction.stationId,
      'tenantId',
      CallAction.GetCompositeSchedule,
      request,
      undefined,
      correlationId,
      MessageOrigin.ChargingStationManagementSystem,
    );
  }

  public async executeClearChargingProfile(
    sessionId: string,
    responseUrl: string,
  ) {
    // based on the current assumption, transactionId is equal to sessionId
    // If this map assumption changes, this needs to be changed
    const transaction =
      await this.transactionRepo.findByTransactionId(sessionId);
    if (!transaction) {
      throw new NotFoundError('Transaction not found');
    }

    const session = (
      await this.sessionMapper.mapTransactionsToSessions([transaction])
    )[0];
    if (!session) {
      throw new NotFoundError('Session not found');
    }

    const chargingProfiles =
      await this.sessionChargingProfileRepo.readAllByQuery({
        where: {
          sessionId: sessionId, // sessionId is unique constraint
        },
      });
    if (!chargingProfiles || chargingProfiles.length === 0) {
      throw new NotFoundError('Charging profile not found');
    }

    const correlationId = uuidv4();

    await this.responseUrlRepo.saveResponseUrl(
      correlationId,
      responseUrl,
      new OcpiParams(
        session.country_code,
        session.party_id,
        session.cdr_token.country_code,
        session.cdr_token.party_id,
      ),
    );

    const request = {
      chargingProfileId: chargingProfiles[0].chargingProfileId,
    } as ClearChargingProfileRequest;

    await this.abstractModule.sendCall(
      transaction.stationId,
      'tenantId',
      CallAction.ClearChargingProfile,
      request,
      undefined,
      correlationId,
      MessageOrigin.ChargingStationManagementSystem,
    );
  }

  public async executePutChargingProfile(
    sessionId: string,
    setChargingProfile: SetChargingProfile,
  ) {
    // based on the current assumption, transactionId is equal to sessionId
    // If this map assumption changes, this needs to be changed
    const transaction =
      await this.transactionRepo.findByTransactionId(sessionId);
    if (!transaction) {
      throw new NotFoundError('Transaction not found');
    }

    const session = (
      await this.sessionMapper.mapTransactionsToSessions([transaction])
    )[0];
    if (!session) {
      throw new NotFoundError('Session not found');
    }

    if (!transaction.evse) {
      throw new NotFoundError('Evse not found');
    }
    const evseId = transaction.evse.id;

    const correlationId = uuidv4();
    await this.responseUrlRepo.saveResponseUrl(
      correlationId,
      setChargingProfile.response_url,
      new OcpiParams(
        session.country_code,
        session.party_id,
        session.cdr_token.country_code,
        session.cdr_token.party_id,
      ),
    );

    const stationId = transaction.stationId;
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
      setChargingProfileRequest.chargingProfile.chargingSchedule[0].id,
    );

    await this.abstractModule.sendCall(
      stationId,
      'tenantId',
      CallAction.SetChargingProfile,
      setChargingProfileRequest,
      undefined,
      correlationId,
      MessageOrigin.ChargingStationManagementSystem,
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

    const profileId =
      await this.chargingProfileRepo.getNextChargingProfileId(stationId);
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
