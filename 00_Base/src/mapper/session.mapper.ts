import { Service } from 'typedi';
import { Session } from '../model/Session';
import {
  MeasurandEnumType,
  MeterValueType,
  TransactionEventEnumType,
  TransactionEventRequest,
} from '@citrineos/base';
import { Transaction, TransactionEvent } from '@citrineos/data';
import { AuthMethod } from '../model/AuthMethod';
import { ChargingPeriod } from '../model/ChargingPeriod';
import { CdrDimensionType } from '../model/CdrDimensionType';
import { OcpiLocation, OcpiLocationProps } from '../model/OcpiLocation';
import { CdrToken } from '../model/CdrToken';
import { SessionStatus } from '../model/SessionStatus';
import { CredentialsService } from '../services/credentials.service';
import { OcpiLocationRepository } from '../repository/OcpiLocationRepository';
import { ILogObj, Logger } from 'tslog';
import { CdrDimension } from '../model/CdrDimension';
import { TokenDTO } from '../model/DTO/TokenDTO';
import { TokensRepository } from '../repository/TokensRepository';

@Service()
export class SessionMapper {
  constructor(
    readonly logger: Logger<ILogObj>,
    readonly credentialsService: CredentialsService,
    readonly ocpiLocationsRepository: OcpiLocationRepository,
    readonly tokensRepository: TokensRepository,
  ) {}

  public async mapTransactionsToSessions(
    transactions: Transaction[],
    _fromCountryCode?: string,
    _fromPartyId?: string,
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
        this.getTokensForTransactions(transactions),
      ]);
    return transactions
      .filter(
        (transaction) => transactionIdToLocationMap[transaction.id], // todo skipping check for token for now
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
    token: TokenDTO,
  ): Session {
    const [startEvent, endEvent] = this.getStartAndEndEvents(
      transaction.transactionEvents,
    );

    return {
      country_code: location.countryCode,
      party_id: location.partyId,
      id: transaction.transactionId,
      start_date_time: new Date(startEvent?.timestamp),
      end_date_time: endEvent ? new Date(endEvent?.timestamp) : null,
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
    let startEvent = transactionEvents.find(
      (event) => event.eventType === TransactionEventEnumType.Started,
    );
    if (!startEvent) {
      this.logger.error("No 'Started' event found in transaction events");
      startEvent = TransactionEvent.build();
    }

    return [
      startEvent!,
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

  private createCdrToken(token: TokenDTO): CdrToken {
    return {
      uid: token?.uid,
      type: token?.type,
      contract_id: token?.contract_id,
      country_code: token?.country_code,
      party_id: token?.party_id,
    };
  }

  private getEvseUid(transaction: Transaction): string {
    // TODO: Can be mapped using UID_FORMAT method in EvseDTO from Location Module
    // Leaving it as a concat of stationId and evseID for now
    return `${transaction.stationId}-${transaction.evse?.id}`;
  }

  private getCurrency(location: OcpiLocation): string {
    switch (location[OcpiLocationProps.countryCode]) {
      case 'US':
      default:
        return 'USD';
    }
  }

  private getChargingPeriods(
    meterValues: MeterValueType[] = [],
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
          previousMeterValue,
        );
      });
  }

  private mapMeterValueToChargingPeriod(
    meterValue: MeterValueType,
    previousMeterValue?: MeterValueType,
  ): ChargingPeriod {
    return {
      start_date_time: new Date(meterValue.timestamp),
      dimensions: this.getCdrDimensions(meterValue, previousMeterValue),
      tariff_id: null, // TODO: Fill in tariff_id value
    };
  }

  private getCdrDimensions(
    meterValue: MeterValueType,
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
            const previousEnergyImport =
              this.getEnergyImportForMeterValue(previousMeterValue);
            if (previousEnergyImport !== undefined) {
              cdrDimensions.push({
                type: CdrDimensionType.ENERGY,
                volume: sampledValue.value - previousEnergyImport,
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
      volume: this.getTimeElapsedForMeterValue(meterValue, previousMeterValue),
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
    previousMeterValue?: MeterValueType,
  ): number {
    const timeDiffMs = previousMeterValue
      ? new Date(meterValue.timestamp).getTime() -
        new Date(previousMeterValue.timestamp).getTime()
      : 0;

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
        continue; // todo
      }
      const locationId = chargingStation.locationId;
      if (!locationId) {
        continue; // todo
      }
      const ocpiLocation =
        await this.ocpiLocationsRepository.readOnlyOneByQuery({
          where: {
            [OcpiLocationProps.coreLocationId]: locationId,
          },
        });
      if (!ocpiLocation) {
        continue; // todo
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
  ): Promise<{ [key: string]: TokenDTO }> {
    const transactionIdToTokenMap: { [transactionId: string]: TokenDTO } = {};

    for (const transaction of transactions) {
      if (
        transaction.transactionEvents &&
        transaction.transactionEvents.length > 0
      ) {
        const idToken = transaction.transactionEvents.find(
          (event) => event.idToken,
        )?.idToken;

        if (idToken?.idToken) {
          const tokenDto = await this.tokensRepository.getTokenDtoByIdToken(
            idToken.idToken,
            idToken.type,
          );

          if (tokenDto) {
            transactionIdToTokenMap[transaction.id] = tokenDto;
          }
        }
      }
    }

    return transactionIdToTokenMap;
  }

  private getTransactionStatus(
    endEvent: TransactionEventRequest | undefined,
  ): SessionStatus {
    // TODO: Implement other session status
    return endEvent ? SessionStatus.COMPLETED : SessionStatus.ACTIVE;
  }
}
