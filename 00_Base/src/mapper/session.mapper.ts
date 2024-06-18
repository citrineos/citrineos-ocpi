import { Service } from 'typedi';
import { Session } from '../model/Session';
import { MeasurandEnumType, MeterValueType, TransactionEventEnumType } from '../../../../citrineos-core/00_Base';
import { TokenType } from '../model/TokenType';
import { AuthMethod } from '../model/AuthMethod';
import { SessionStatus } from '../model/SessionStatus';
import { Transaction } from '../../../../citrineos-core/01_Data';
import { ChargingPeriod } from '../model/ChargingPeriod';
import { CdrDimensionType } from '../model/CdrDimensionType';

@Service()
export class SessionMapper {
  constructor() {
  }

  public mapTransactionToSession(fromCountryCode: string,
                                 fromPartyId: string,
                                 toCountryCode: string,
                                 toPartyId: string, transaction: Transaction): Session {
    const startEvent = transaction.transactionEvents?.find(
      (event) => event.eventType === TransactionEventEnumType.Started,
    );
    const endEvent = transaction.transactionEvents?.find(
      (event) => event.eventType === TransactionEventEnumType.Ended,
    );

    return {
      country_code: toCountryCode,
      party_id: toPartyId,
      id: transaction.id,
      start_date_time: startEvent ? new Date(startEvent.timestamp) : null,
      end_date_time: endEvent ? new Date(endEvent.timestamp) : null,
      kwh: transaction.totalKwh || 0,
      cdr_token: {
        // TODO: Token Type needs to be derived from somewhere and based on this, uid value would be chosen
        // APP_USER UID is provided by MSP. If during RFID, CPO would use this value to identify the token on their scanner
        uid: "MSP_TOKEN_UID",
        type: TokenType.OTHER,
        // TODO: All three below needs to be somehow provided from MSP
        contract_id: "MSP_CONTRACT_ID",
        country_code: fromCountryCode,
        party_id: fromPartyId,
      },
      // Defaulting to WHITELIST, otherwise Auth support / reservation support needs to be added with MSP
      auth_method: AuthMethod.WHITELIST,
      location_id: transaction.stationId,
      evse_uid: "evse-uid", // TODO: Figure out EVSE UID Mapping
      connector_id: String(transaction.evse?.connectorId),
      currency: "USD", // TODO: Determine currency from configuration
      charging_periods: this.getChargingPeriods(transaction.meterValues),
      status: endEvent ? SessionStatus.COMPLETED : SessionStatus.ACTIVE,
      last_updated: new Date(),
      // TODO: Optional Fields
      authorization_reference: null,
      total_cost: null,
      meter_id: null,
    };
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
      .sort((a, b) => (a.start_date_time < b.start_date_time ? -1 : 1));
  }

  private mapMeasurandToCdrDimensionType(
    measurand: MeasurandEnumType | undefined,
  ): CdrDimensionType {
    // TODO: Implement mapping logic based on MeasurandEnumType
    return CdrDimensionType.ENERGY;
  }
}