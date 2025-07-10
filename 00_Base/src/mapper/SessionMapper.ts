import { Service } from 'typedi';
import { Session } from '../model/Session';
import {
  MeasurandEnumType,
  MeterValueType,
  TransactionEventRequest,
} from '@citrineos/base';
import { Tariff, Transaction } from '@citrineos/data';
import { AuthMethod } from '../model/AuthMethod';
import { ChargingPeriod } from '../model/ChargingPeriod';
import { CdrDimensionType } from '../model/CdrDimensionType';
import { CdrToken } from '../model/CdrToken';
import { SessionStatus } from '../model/SessionStatus';
import { CredentialsService } from '../services/CredentialsService';
import { OcpiLocationRepository } from '../repository/OcpiLocationRepository';
import { ILogObj, Logger } from 'tslog';
import { CdrDimension } from '../model/CdrDimension';
import { TokenDTO } from '../model/DTO/TokenDTO';
import { BaseTransactionMapper } from './BaseTransactionMapper';
import { LocationsService } from '../services/LocationsService';
import { LocationDTO } from '../model/DTO/LocationDTO';
import { TariffsDatasource } from '../datasources/TariffsDatasource';
import { EXTRACT_EVSE_ID } from '../model/DTO/EvseDTO';
import { TokensDatasource } from '../datasources/TokensDatasource';

@Service()
export class SessionMapper extends BaseTransactionMapper {
  constructor(
    protected logger: Logger<ILogObj>,
    protected locationsService: LocationsService,
    protected ocpiLocationsRepository: OcpiLocationRepository,
    protected tokensDatasource: TokensDatasource,
    protected tariffsDatasource: TariffsDatasource,
    readonly credentialsService: CredentialsService,
  ) {
    super(
      logger,
      locationsService,
      ocpiLocationsRepository,
      tokensDatasource,
      tariffsDatasource,
    );
  }

  public async getLocationsTokensAndTariffsMapsForTransactions(
    transactions: Transaction[],
  ): Promise<
    [Map<string, LocationDTO>, Map<string, TokenDTO>, Map<string, Tariff>]
  > {
    return await Promise.all([
      this.getLocationDTOsForTransactions(transactions),
      this.getTokensForTransactions(transactions),
      this.getTariffsForTransactions(transactions),
    ]);
  }

  public async mapTransactionsToSessions(
    transactions: Transaction[],
  ): Promise<Session[]> {
    const [
      transactionIdToLocationMap,
      transactionIdToTokenMap,
      transactionIdToTariffMap,
    ] =
      await this.getLocationsTokensAndTariffsMapsForTransactions(transactions);
    return await this.mapTransactionsToSessionsHelper(
      transactions,
      transactionIdToLocationMap,
      transactionIdToTokenMap,
      transactionIdToTariffMap,
    );
  }

  public async mapTransactionsToSessionsHelper(
    transactions: Transaction[],
    transactionIdToLocationMap: Map<string, LocationDTO>,
    transactionIdToTokenMap: Map<string, TokenDTO>,
    transactionIdToTariffMap: Map<string, Tariff>,
  ): Promise<Session[]> {
    const result: Session[] = [];
    for (const transaction of transactions) {
      const location = transactionIdToLocationMap.get(
        transaction.transactionId,
      );
      const token = transactionIdToTokenMap.get(transaction.transactionId);
      const tariff = transactionIdToTariffMap.get(transaction.transactionId);

      if (location && token && tariff) {
        result.push(
          this.mapTransactionToSession(transaction, location, token, tariff),
        );
      }
    }
    return result;
  }

  private mapTransactionToSession(
    transaction: Transaction,
    location: LocationDTO,
    token: TokenDTO,
    tariff: Tariff,
  ): Session {
    const [startEvent, endEvent] = this.getStartAndEndEvents(transaction);

    return {
      country_code: location.country_code,
      party_id: location.party_id,
      id: transaction.transactionId,
      start_date_time: new Date(startEvent?.timestamp),
      end_date_time: endEvent ? new Date(endEvent?.timestamp) : null,
      kwh: transaction.totalKwh || 0,
      cdr_token: this.createCdrToken(token),
      // TODO: Implement other auth methods
      auth_method: AuthMethod.WHITELIST,
      location_id: this.getLocationId(location),
      evse_uid: this.getEvseUid(transaction, location),
      connector_id: this.getConnectorId(transaction, location),
      currency: tariff.currency,
      charging_periods: this.getChargingPeriods(
        transaction.meterValues,
        String(tariff?.id),
      ),
      status: this.getTransactionStatus(endEvent),
      last_updated: this.getLatestEvent(transaction.transactionEvents!),
      // TODO: Fill in optional values
      authorization_reference: null,
      total_cost: endEvent
        ? this.calculateTotalCost(transaction.totalKwh || 0, tariff.pricePerKwh)
        : null,
      meter_id: null,
    };
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

  private getLocationId(location: LocationDTO) {
    if (!location.id) {
      this.logger.warn(`Location missing for location ${location.id}`);
    }

    return location.id ?? '';
  }

  private getEvseUid(transaction: Transaction, location: LocationDTO): string {
    const evseUid = location.evses?.find(
      (evse) => EXTRACT_EVSE_ID(evse.uid) === String(transaction.evse?.id),
    )?.uid;

    if (!evseUid) {
      this.logger.warn(
        `Evse missing for ${transaction.transactionId} on location ${location.id}`,
      );
    }

    return evseUid ?? '';
  }

  private getConnectorId(
    transaction: Transaction,
    location: LocationDTO,
  ): string {
    const connectorId = location.evses
      ?.find(
        (evse) => EXTRACT_EVSE_ID(evse.uid) === String(transaction.evse?.id),
      )
      ?.connectors?.find(
        (connector) => connector.id === String(transaction.evse?.connectorId),
      )?.id;

    if (!connectorId) {
      this.logger.warn(
        `Connector missing for ${transaction.transactionId} on location ${location.id}`,
      );
    }

    return connectorId ?? '';
  }

  private getCurrency(location: LocationDTO): string {
    switch (location.country_code) {
      case 'US':
      default:
        return '';
    }
  }

  private getChargingPeriods(
    meterValues: MeterValueType[] = [],
    tariffId: string,
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
          tariffId,
          previousMeterValue,
        );
      });
  }

  private mapMeterValueToChargingPeriod(
    meterValue: MeterValueType,
    tariffId: string,
    previousMeterValue?: MeterValueType,
  ): ChargingPeriod {
    return {
      start_date_time: new Date(meterValue.timestamp),
      dimensions: this.getCdrDimensions(meterValue, previousMeterValue),
      tariff_id: tariffId,
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

  private getTransactionStatus(
    endEvent: TransactionEventRequest | undefined,
  ): SessionStatus {
    // TODO: Implement other session status
    return endEvent ? SessionStatus.COMPLETED : SessionStatus.ACTIVE;
  }
}
