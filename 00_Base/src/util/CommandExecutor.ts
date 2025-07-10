import { StartSession } from '../model/StartSession';
import {
  AbstractModule,
  CallAction,
  CancelReservationRequest,
  ChargingProfileKindEnumType,
  ChargingProfilePurposeEnumType,
  ChargingProfileType,
  ChargingScheduleType,
  ClearChargingProfileRequest,
  GetCompositeScheduleRequest,
  MessageOrigin,
  RequestStartTransactionRequest,
  RequestStopTransactionRequest,
  ReserveNowRequest,
  SetChargingProfileRequest,
} from '@citrineos/base';
import { Service } from 'typedi';
import { ResponseUrlRepository } from '../repository/ResponseUrlRepository';
import { v4 as uuidv4 } from 'uuid';
import { StopSession } from '../model/StopSession';
import {
  CallMessage,
  Reservation,
  SequelizeCallMessageRepository,
  SequelizeChargingProfileRepository,
  SequelizeReservationRepository,
  SequelizeTransactionEventRepository,
} from '@citrineos/data';
import { SetChargingProfile } from '../model/SetChargingProfile';
import { BadRequestError, NotFoundError } from 'routing-controllers';
import { ChargingProfile } from '../model/ChargingProfile';
import { SessionChargingProfileRepository } from '../repository/SessionChargingProfileRepository';
import { OcpiEvseRepository } from '../repository/OcpiEvseRepository';
import { OcpiTokensMapper } from '../mapper/OcpiTokensMapper';
import { SessionMapper } from '../mapper/SessionMapper';
import { OcpiParams } from '../trigger/util/OcpiParams';
import { ReserveNow } from '../model/ReserveNow';
import { CancelReservation } from '../model/CancelReservation';
import { OcpiReservationRepository } from '../repository/OcpiReservationRepository';
import {
  OcpiReservation,
  OcpiReservationProps,
} from '../model/OcpiReservation';
import { OcpiLocationRepository } from '../repository/OcpiLocationRepository';
import { OcpiLocation, OcpiLocationProps } from '../model/OcpiLocation';
import { LocationsDatasource } from '../datasources/LocationsDatasource';
import { EXTRACT_EVSE_ID, EXTRACT_STATION_ID } from '../model/DTO/EvseDTO';

@Service()
export class CommandExecutor {
  constructor(
    readonly abstractModule: AbstractModule,
    readonly responseUrlRepo: ResponseUrlRepository,
    readonly sessionChargingProfileRepo: SessionChargingProfileRepository,
    readonly ocpiEvseEntityRepo: OcpiEvseRepository,
    readonly ocpiLocationRepo: OcpiLocationRepository,
    readonly ocpiReservationRepo: OcpiReservationRepository,
    readonly transactionRepo: SequelizeTransactionEventRepository,
    readonly chargingProfileRepo: SequelizeChargingProfileRepository,
    readonly coreReservationRepo: SequelizeReservationRepository,
    readonly callMessageRepo: SequelizeCallMessageRepository,
    readonly sessionMapper: SessionMapper,
    readonly locationsDatasource: LocationsDatasource,
  ) {}

  public async executeStartSession(startSession: StartSession): Promise<void> {
    // TODO: update to handle optional evse uid.
    const evse = await this.ocpiEvseEntityRepo.getOcpiEvseByEvseUid(
      startSession.evse_uid!,
    );

    if (!evse) {
      throw new NotFoundError('EVSE not found');
    }

    if (!startSession.token) {
      throw new BadRequestError('Missing token');
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

  public async executeReserveNow(
    reserveNow: ReserveNow,
    countryCode: string,
    partyId: string,
  ): Promise<void> {
    // Currently, it rejects the request if the evse_uid is missing
    // When we have the solution to handle the optional evse_uid, we should change this
    if (!reserveNow.evse_uid) {
      throw new BadRequestError('Missing evse_uid');
    }
    const evseId = Number(EXTRACT_EVSE_ID(reserveNow.evse_uid!));
    const stationId = EXTRACT_STATION_ID(reserveNow.evse_uid!);
    // Check if evse exists and given evse_uid matches the given location_id
    if (
      !(await this.locationsDatasource.getEvse(
        Number(reserveNow.location_id),
        stationId,
        evseId,
      ))
    ) {
      throw new NotFoundError('EVSE not found');
    }
    const ocpiLocation =
      await this.ocpiLocationRepo.getLocationByCoreLocationId(
        Number(reserveNow.location_id),
      );
    if (!ocpiLocation) {
      throw new NotFoundError('Location not found');
    }

    const correlationId = uuidv4();
    await this.responseUrlRepo.saveResponseUrl(
      correlationId,
      reserveNow.response_url,
      new OcpiParams(
        ocpiLocation[OcpiLocationProps.countryCode],
        ocpiLocation[OcpiLocationProps.partyId],
        countryCode,
        partyId,
      ),
    );

    const [request, coreReservationDBId] =
      await this.createAndStoreReservations(
        reserveNow,
        stationId,
        evseId,
        countryCode,
        partyId,
      );

    // Store the correlationId and core reservationDBId in the call message so that we can update the corresponding
    // core reservation when the response is received
    await this.callMessageRepo.create(
      CallMessage.build({
        correlationId,
        reservationId: coreReservationDBId,
      }),
    );
    await this.abstractModule.sendCall(
      stationId,
      'tenantId',
      CallAction.ReserveNow,
      request,
      undefined,
      correlationId,
      MessageOrigin.ChargingStationManagementSystem,
    );
  }

  public async executeCancelReservation(
    cancelReservation: CancelReservation,
    countryCode: string,
    partyId: string,
  ): Promise<void> {
    const existingOcpiReservation =
      await this.ocpiReservationRepo.readOnlyOneByQuery({
        where: {
          // unique constraint
          [OcpiReservationProps.reservationId]:
            cancelReservation.reservation_id,
          [OcpiReservationProps.countryCode]: countryCode,
          [OcpiReservationProps.partyId]: partyId,
        },
        include: [Reservation, OcpiLocation],
      });
    if (!existingOcpiReservation) {
      throw new NotFoundError(
        `Reservation ${cancelReservation.reservation_id} not found`,
      );
    }

    const correlationId = uuidv4();
    await this.responseUrlRepo.saveResponseUrl(
      correlationId,
      cancelReservation.response_url,
      new OcpiParams(
        existingOcpiReservation[OcpiReservationProps.location][
          OcpiLocationProps.countryCode
        ],
        existingOcpiReservation[OcpiReservationProps.location][
          OcpiLocationProps.partyId
        ],
        countryCode,
        partyId,
      ),
    );

    const existingCoreReservation = existingOcpiReservation.coreReservation;
    await this.callMessageRepo.create(
      CallMessage.build({
        correlationId,
        reservationId: existingCoreReservation.databaseId,
      }),
    );
    await this.abstractModule.sendCall(
      existingCoreReservation.stationId,
      'tenantId',
      CallAction.CancelReservation,
      {
        reservationId: existingCoreReservation.id,
      } as CancelReservationRequest,
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

  /**
   * Create and store reservation related objects, including the core reservation, the ocpi reservation and the
   * reserveNow request
   *
   * @param reserveNow - OCPI reserveNow
   * @param evse - OCPI evse
   * @param countryCode - MSP country code
   * @param partyId - MSP party id
   * @returns [reserveNowRequest, coreReservationDatabaseId]
   */
  private async createAndStoreReservations(
    reserveNow: ReserveNow,
    stationId: string,
    evseId: number,
    countryCode: string,
    partyId: string,
  ): Promise<[ReserveNowRequest, number]> {
    const existingOcpiReservation =
      await this.ocpiReservationRepo.readOnlyOneByQuery({
        where: {
          // unique constraint
          [OcpiReservationProps.reservationId]: reserveNow.reservation_id,
          [OcpiReservationProps.countryCode]: countryCode,
          [OcpiReservationProps.partyId]: partyId,
        },
        include: [Reservation],
      });

    let coreReservationId;
    if (!existingOcpiReservation) {
      // Based on OCPI 2.1.1, The reservation_id sent by the Sender (eMSP) to the Receiver (CPO) SHALL NOT be sent
      // directly to a Charge Point. The CPO SHALL make sure the Reservation ID sent to the Charge Point is unique and
      // is not used by another Sender(eMSP).
      coreReservationId =
        await this.coreReservationRepo.getNextReservationId(stationId);
    } else {
      coreReservationId = existingOcpiReservation.coreReservation.id;
    }
    if (!coreReservationId) {
      throw new Error('Could not get core reservation id.');
    }

    const request = {
      id: coreReservationId,
      expiryDateTime: reserveNow.expiry_date.toISOString(),
      idToken: {
        idToken: reserveNow.token.uid,
        type: OcpiTokensMapper.mapOcpiTokenTypeToOcppIdTokenType(
          reserveNow.token.type,
        ),
      },
      evseId,
    } as ReserveNowRequest;
    const storedCoreReservation =
      await this.coreReservationRepo.createOrUpdateReservation(
        request,
        stationId,
        false,
      );
    if (!storedCoreReservation) {
      throw new Error('Could not create or update reservation in core.');
    }

    await this.ocpiReservationRepo.createOrUpdateReservation(
      OcpiReservation.build({
        [OcpiReservationProps.coreReservationId]:
          storedCoreReservation.databaseId,
        [OcpiReservationProps.reservationId]: reserveNow.reservation_id,
        [OcpiReservationProps.countryCode]: countryCode,
        [OcpiReservationProps.partyId]: partyId,
        [OcpiReservationProps.locationId]: reserveNow.location_id,
        [OcpiReservationProps.evseUid]: reserveNow.evse_uid ?? null,
        [OcpiReservationProps.authorizationReference]:
          reserveNow.authorization_reference ?? null,
      }),
    );

    return [request, storedCoreReservation.databaseId];
  }
}
