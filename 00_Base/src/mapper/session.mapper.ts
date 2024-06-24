import { Service } from 'typedi';
import { Session } from '../model/Session';
import {
  MeasurandEnumType,
  MeterValueType,
  TransactionEventEnumType,
  TransactionEventRequest,
} from '../../../../citrineos-core/00_Base';
import { AuthMethod } from '../model/AuthMethod';
import { SessionStatus } from '../model/SessionStatus';
import { Transaction } from '../../../../citrineos-core/01_Data';
import { ChargingPeriod } from '../model/ChargingPeriod';
import { CdrDimensionType } from '../model/CdrDimensionType';
import { SequelizeLocationRepository } from '../../../../citrineos-core/01_Data/src/layers/sequelize';
import { Token } from '../model/Token';
import { Location } from '../model/Location';
import { CdrToken } from '../model/CdrToken';
import { TokenType } from '../model/TokenType';

@Service()
export class SessionMapper {
  constructor(
    private readonly locationRepository: SequelizeLocationRepository,
  ) {}

  private getTokensForTransactions(
    transactions: Transaction[],
    mspCountryCode?: string,
    mspPartyId?: string,
  ): Map<string, Token> {
    // TODO: Create mapping between Transaction.idToken and OCPI Token
    // Only get Tokens that belong to the MSP if provided
    return new Map();
  }

  private getLocationsForTransactions(
    transactions: Transaction[],
    cpoCountryCode?: string,
    cpoPartyId?: string,
  ): Map<string, Location> {
    // TODO: Create mapping between transactions and locations
    // Only get Locations that belong to the CPO if provided
    return new Map();
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
          transactionIdToLocationMap.has(transaction.id) &&
          transactionIdToTokenMap.has(transaction.id),
      )
      .map((transaction) => {
        const location = transactionIdToLocationMap.get(transaction.id)!;
        const token = transactionIdToTokenMap.get(transaction.id)!;
        return this.mapTransactionToSession(transaction, location, token);
      });
  }

  private mapTransactionToSession(
    transaction: Transaction,
    location: Location,
    token: Token,
  ): Session {
    const [startEvent, endEvent] = this.getStartAndEndEvents(
      transaction.transactionEvents,
    );

    return {
      country_code: location.country_code,
      party_id: location.party_id,
      id: transaction.id,
      start_date_time: startEvent ? new Date(startEvent.timestamp) : null,
      end_date_time: endEvent ? new Date(endEvent.timestamp) : null,
      kwh: transaction.totalKwh || 0,
      cdr_token: this.createCdrToken(token),
      auth_method: AuthMethod.WHITELIST,
      location_id: String(location.id),
      evse_uid: this.getEvseUid(transaction),
      connector_id: String(transaction.evse?.connectorId),
      currency: this.getCurrency(location),
      charging_periods: this.getChargingPeriods(transaction.meterValues),
      status: endEvent ? SessionStatus.COMPLETED : SessionStatus.ACTIVE,
      last_updated: new Date(),
      authorization_reference: null,
      total_cost: null,
      meter_id: null,
    };
  }

  private getStartAndEndEvents(
    transactionEvents: TransactionEventRequest[] = [],
  ): [
    TransactionEventRequest | undefined,
    TransactionEventRequest | undefined,
  ] {
    return [
      transactionEvents.find(
        (event) => event.eventType === TransactionEventEnumType.Started,
      ),
      transactionEvents.find(
        (event) => event.eventType === TransactionEventEnumType.Ended,
      ),
    ];
  }

  private createCdrToken(token: Token): CdrToken {
    return {
      uid: token.uid,
      type: this.mapTokenType(token.type),
      contract_id: token.contract_id,
      country_code: token.country_code,
      party_id: token.party_id,
    };
  }

  private mapTokenType(ocpiTokenType: string): TokenType {
    // TODO: Implement mapping from OCPI Token type to CDR Token type
    return TokenType.OTHER;
  }

  private getEvseUid(transaction: Transaction): string {
    // TODO: Figure out EVSE UID Mapping
    // Leaving it as a concat of stationId and evseID for now
    return `${transaction.stationId}-${transaction.evse?.id}`;
  }

  private getCurrency(location: Location): string {
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
        tariff_id: null,
      }))
      .sort(
        (a, b) => a.start_date_time.getTime() - b.start_date_time.getTime(),
      );
  }

  private mapMeasurandToCdrDimensionType(
    measurand: MeasurandEnumType | undefined,
  ): CdrDimensionType {
    // TODO: Implement mapping logic based on MeasurandEnumType
    return CdrDimensionType.ENERGY;
  }
}
