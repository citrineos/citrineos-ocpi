import {Service} from 'typedi';
import {Session} from '../model/Session';
import {MeasurandEnumType, MeterValueType, TransactionEventEnumType, TransactionEventRequest,} from '@citrineos/base';
import {AuthMethod} from '../model/AuthMethod';
import {Transaction} from '@citrineos/data';
import {ChargingPeriod} from '../model/ChargingPeriod';
import {CdrDimensionType} from '../model/CdrDimensionType';
import {Token} from '../model/Token';
import {OcpiLocation, OcpiLocationProps} from '../model/OcpiLocation';
import {CdrToken} from '../model/CdrToken';
import {SessionStatus} from '../model/SessionStatus';
import {CredentialsService} from '../services/credentials.service';
import {OcpiLocationRepository} from '../repository/OcpiLocationRepository';
import {ILogObj, Logger} from "tslog";


@Service()
export class SessionMapper {
  constructor(
    readonly logger: Logger<ILogObj>,
    readonly credentialsService: CredentialsService,
    readonly ocpiLocationsRepository: OcpiLocationRepository,
  ) {
  }

  public async mapTransactionsToSessions(
    transactions: Transaction[],
    fromCountryCode?: string,
    fromPartyId?: string,
    toCountryCode?: string,
    toPartyId?: string,
  ): Promise<Session[]> {
    const [transactionIdToLocationMap, transactionIdToTokenMap] =
      await Promise.all([
        this.getLocationsForTransactions(
          transactions,
          toCountryCode,
          toPartyId,
        ),
        this.getTokensForTransactions(
          transactions,
          fromCountryCode,
          fromPartyId,
        ),
      ]);
    return transactions
      .filter(
        (transaction) =>
          transactionIdToLocationMap[transaction.id] && // todo may be falsy, check for nullability
          transactionIdToTokenMap[transaction.id], // todo may be falsy, check for nullability
      )
      .map((transaction) => {
        const location = transactionIdToLocationMap[transaction.id]!;
        const token = transactionIdToTokenMap[transaction.id]!;
        return this.mapTransactionToSession(transaction, location, token);
      });
  }

  private mapTransactionToSession(
    transaction: Transaction,
    location: OcpiLocation,
    token: Token,
  ): Session {
    const [startEvent, endEvent] = this.getStartAndEndEvents(
      transaction.transactionEvents,
    );

    return {
      country_code: location.country_code,
      party_id: location.party_id,
      id: transaction.transactionId,
      start_date_time: new Date(startEvent.timestamp),
      end_date_time: endEvent ? new Date(endEvent.timestamp) : null,
      kwh: transaction.totalKwh || 0,
      cdr_token: this.createCdrToken(token),
      // TODO: Implement other auth methods
      auth_method: AuthMethod.WHITELIST,
      location_id: String(location.id),
      evse_uid: this.getEvseUid(transaction),
      connector_id: String(transaction.evse?.connectorId),
      currency: this.getCurrency(location),
      charging_periods: this.getChargingPeriods(transaction.meterValues),
      status: this.getTransactionStatus(endEvent),
      last_updated: this.getLatestEvent(transaction.transactionEvents!),
      // TODO: Fill in optional values
      authorization_reference: null,
      total_cost: null,
      meter_id: null,
    };
  }

  private getStartAndEndEvents(
    transactionEvents: TransactionEventRequest[] = [],
  ): [TransactionEventRequest, TransactionEventRequest | undefined] {
    const startEvent = transactionEvents.find(
      (event) => event.eventType === TransactionEventEnumType.Started,
    );
    if (!startEvent) {
      throw new Error("No 'Started' event found in transaction events");
    }

    return [
      startEvent,
      transactionEvents.find(
        (event) => event.eventType === TransactionEventEnumType.Ended,
      ),
    ];
  }

  private getLatestEvent(transactionEvents: TransactionEventRequest[]): Date {
    return transactionEvents.reduce((latestDate, current) => {
      const currentDate = new Date(current.timestamp);
      if (!latestDate || currentDate > latestDate) {
        return currentDate;
      }
      return latestDate;
    }, new Date(transactionEvents[0].timestamp));
  }

  private createCdrToken(token: Token): CdrToken {
    return {
      uid: token.uid,
      type: token.type,
      contract_id: token.contract_id,
      country_code: token.country_code,
      party_id: token.party_id,
    };
  }

  private getEvseUid(transaction: Transaction): string {
    // TODO: Can be mapped using UID_FORMAT method in EvseDTO from Location Module
    // Leaving it as a concat of stationId and evseID for now
    return `${transaction.stationId}-${transaction.evse?.id}`;
  }

  private getCurrency(_location: OcpiLocation): string {
    // TODO: Implement currency determination logic based on location or configuration
    return 'USD';
  }

  private getChargingPeriods(
    meterValues: MeterValueType[] = [],
  ): ChargingPeriod[] {
    return meterValues
      .map((meterValue) => ({
        start_date_time: new Date(meterValue.timestamp),
        dimensions: meterValue.sampledValue.map((sampledValue) => ({
          type: this.mapMeasurandToCdrDimensionType(sampledValue.measurand),
          volume: sampledValue.value as number,
        })),
        // TODO: Fill in tariff_id value
        tariff_id: null,
      }))
      .sort(
        (a, b) => a.start_date_time.getTime() - b.start_date_time.getTime(),
      );
  }

  private mapMeasurandToCdrDimensionType(
    _measurand: MeasurandEnumType | undefined,
  ): CdrDimensionType {
    // TODO: Implement mapping logic based on MeasurandEnumType
    return CdrDimensionType.ENERGY;
  }

  private getLocationsForTransactions = async (
    transactions: Transaction[],
    cpoCountryCode?: string,
    cpoPartyId?: string,
  ): Promise<{ [key: string]: OcpiLocation }> => {
    const transactionIdToLocationMap: { [key: string]: OcpiLocation } = {};
    for (const transaction of transactions) {
      const chargingStation = await transaction.$get("station");
      if (!chargingStation) {
        throw new Error(`todo`); // todo
      }
      const locationId = chargingStation.locationId;
      if (!locationId) {
        throw new Error(`todo`); // todo
      }
      const ocpiLocation = await this.ocpiLocationsRepository.readByKey(String(locationId));
      if (!ocpiLocation) {
        throw new Error(`todo`); // todo
      }
      if (ocpiLocation[OcpiLocationProps.countryCode] === cpoCountryCode && ocpiLocation[OcpiLocationProps.partyId] === cpoPartyId) {
        transactionIdToLocationMap[transaction.id] = ocpiLocation;
      }
    }

    return transactionIdToLocationMap;
  };

  private getTokensForTransactions(
    transactions: Transaction[],
    mspCountryCode?: string,
    mspPartyId?: string,
  ): { [key: string]: Token } {
    // TODO: Create mapping between Transaction.idToken and OCPI Token
    // Only get Tokens that belong to the MSP if provided

    // TODO: Remove this mock mapping and replace with real token fetch
    const map = new Map();
    for (const transaction of transactions) {
      const token = new Token();
      token.country_code = mspCountryCode || 'US';
      token.party_id = mspPartyId || 'MSP';
      map.set(transaction.id, token);
    }

    return map as any;
  }

  private getTransactionStatus(
    endEvent: TransactionEventRequest | undefined,
  ): SessionStatus {
    // TODO: Implement other session status
    return endEvent ? SessionStatus.COMPLETED : SessionStatus.ACTIVE;
  }
}
