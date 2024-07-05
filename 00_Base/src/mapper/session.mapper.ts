import { Service } from 'typedi';
import { Session } from '../model/Session';
import { MeasurandEnumType, MeterValueType, TransactionEventEnumType, TransactionEventRequest, } from '@citrineos/base';
import { AuthMethod } from '../model/AuthMethod';
import { Transaction } from '@citrineos/data';
import { ChargingPeriod } from '../model/ChargingPeriod';
import { CdrDimensionType } from '../model/CdrDimensionType';
import { OCPIToken, SingleTokenRequest } from '../model/OCPIToken';
import { OcpiLocation, OcpiLocationProps } from '../model/OcpiLocation';
import { CdrToken } from '../model/CdrToken';
import { SessionStatus } from '../model/SessionStatus';
import { CredentialsService } from '../services/credentials.service';
import { OcpiLocationRepository } from '../repository/OcpiLocationRepository';
import { ILogObj, Logger } from 'tslog';
import { CdrDimension } from '../model/CdrDimension';
import { TokensService } from '../services/TokensService';

@Service()
export class SessionMapper {
  constructor(
    readonly logger: Logger<ILogObj>,
    readonly credentialsService: CredentialsService,
    readonly ocpiLocationsRepository: OcpiLocationRepository,
    readonly tokensService: TokensService
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
    token: OCPIToken,
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
      charging_periods: this.getChargingPeriods(
        transaction.meterValues,
        new Date(startEvent.timestamp),
      ),
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

  private createCdrToken(token: OCPIToken): CdrToken {
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
    transactionStart: Date,
  ): ChargingPeriod[] {
    return meterValues
      .sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      )
      .map((meterValue, index, sortedMeterValues) => {
        const previousMeterValue =
          index > 0 ? sortedMeterValues[index - 1] : undefined;
        return this.mapMeterValueToChargingPeriod(
          meterValue,
          transactionStart,
          previousMeterValue,
        );
      });
  }

  private mapMeterValueToChargingPeriod(
    meterValue: MeterValueType,
    transactionStart: Date,
    previousMeterValue?: MeterValueType,
  ): ChargingPeriod {
    return {
      start_date_time: new Date(meterValue.timestamp),
      dimensions: this.getCdrDimensions(
        meterValue,
        transactionStart,
        previousMeterValue,
      ),
      tariff_id: null, // TODO: Fill in tariff_id value
    };
  }

  private getCdrDimensions(
    meterValue: MeterValueType,
    transactionStart: Date,
    previousMeterValue?: MeterValueType,
  ): CdrDimension[] {
    const cdrDimensions: CdrDimension[] = [];
    for (const sampledValue of meterValue.sampledValue) {
      switch (sampledValue.measurand) {
        case MeasurandEnumType.Current_Import:
          if (sampledValue.phase === 'N') {
            cdrDimensions.push({
              type: CdrDimensionType.CURRENT,
              volume: sampledValue.value,
            });
          }
          break;
        case MeasurandEnumType.Energy_Active_Import_Register:
          if (!sampledValue.phase) {
            cdrDimensions.push({
              type: CdrDimensionType.ENERGY_IMPORT,
              volume: sampledValue.value,
            });
            const previousEnergy =
              this.getEnergyImportForMeterValue(previousMeterValue);
            if (previousEnergy) {
              cdrDimensions.push({
                type: CdrDimensionType.ENERGY,
                volume: sampledValue.value - previousEnergy,
              });
            }
          }
          break;
        case MeasurandEnumType.SoC:
          cdrDimensions.push({
            type: CdrDimensionType.STATE_OF_CHARGE,
            volume: sampledValue.value,
          });
          break;
      }
    }
    cdrDimensions.push({
      type: CdrDimensionType.TIME,
      volume: this.getTimeElapsedForMeterValue(
        meterValue,
        transactionStart,
        previousMeterValue,
      ),
    });
    return cdrDimensions;
  }

  private getEnergyImportForMeterValue(meterValue?: MeterValueType) {
    return (
      meterValue?.sampledValue.find(
        (sampledValue) =>
          sampledValue.measurand ===
          MeasurandEnumType.Energy_Active_Import_Register &&
          !sampledValue.phase,
      )?.value ?? undefined
    );
  }

  private getTimeElapsedForMeterValue(
    meterValue: MeterValueType,
    transactionStart: Date,
    previousMeterValue?: MeterValueType,
  ): number {
    const timeDiffMs = previousMeterValue
      ? new Date(meterValue.timestamp).getTime() -
      new Date(previousMeterValue.timestamp).getTime()
      : new Date(meterValue.timestamp).getTime() - transactionStart.getTime();

    // Convert milliseconds to hours
    return timeDiffMs / (1000 * 60 * 60); // 1000 ms/sec * 60 sec/min * 60 min/hour
  }

  private getLocationsForTransactions = async (
    transactions: Transaction[],
    cpoCountryCode?: string,
    cpoPartyId?: string,
  ): Promise<{ [key: string]: OcpiLocation }> => {
    const transactionIdToLocationMap: { [key: string]: OcpiLocation } = {};
    for (const transaction of transactions) {
      const chargingStation = await transaction.$get('station');
      if (!chargingStation) {
        throw new Error(`todo`); // todo
      }
      const locationId = chargingStation.locationId;
      if (!locationId) {
        throw new Error(`todo`); // todo
      }
      const ocpiLocation =
        await this.ocpiLocationsRepository.readOnlyOneByQuery({
          where: {
            [OcpiLocationProps.citrineLocationId]: locationId,
          },
        });
      if (!ocpiLocation) {
        throw new Error(`todo`); // todo
      }
      if (
        (ocpiLocation[OcpiLocationProps.countryCode] === cpoCountryCode &&
          ocpiLocation[OcpiLocationProps.partyId] === cpoPartyId) ||
        (!cpoCountryCode && !cpoPartyId)
      ) {
        transactionIdToLocationMap[transaction.id] = ocpiLocation;
      }
    }

    return transactionIdToLocationMap;
  };

  private async getTokensForTransactions(
    transactions: Transaction[],
    mspCountryCode?: string,
    mspPartyId?: string,
  ): Promise<{ [key: string]: OCPIToken }> {
    const tokenRequests: SingleTokenRequest[] = [];
    const validTransactions: Transaction[] = [];

    transactions.forEach(transaction => {
      if (transaction.transactionEvents && transaction.transactionEvents.length > 0) {
        const idToken = transaction.transactionEvents[0].idToken;
        if (idToken?.idToken) {
          tokenRequests.push(SingleTokenRequest.build(
            mspCountryCode || '',
            mspPartyId || '',
            idToken.idToken
          ));
          validTransactions.push(transaction);
        }
      }
    });

    // Current implementation using getSingleToken with Promise.all
    const tokens = await Promise.all(
      tokenRequests.map(request => this.tokensService.getSingleToken(request))
    );

    // Future implementation using getMultipleTokens
    // TODO: Uncomment and use this once getMultipleTokens is implemented
    // const tokens = await this.tokensService.getMultipleTokens(tokenRequests);

    const transactionIdToTokenMap: { [key: string]: OCPIToken } = {};

    validTransactions.forEach((transaction, index) => {
      if (tokens[index]) {
        transactionIdToTokenMap[transaction.id] = tokens[index] ?? new OCPIToken();
      }
    });

    return transactionIdToTokenMap;
  }

  private getTransactionStatus(
    endEvent: TransactionEventRequest | undefined,
  ): SessionStatus {
    // TODO: Implement other session status
    return endEvent ? SessionStatus.COMPLETED : SessionStatus.ACTIVE;
  }
}