import { Service } from 'typedi';
import { PaginatedSessionResponse, Session } from '../model/Session';
import { Transaction } from '../../../../citrineos-core/01_Data';
import { TransactionEventEnumType } from '../../../../citrineos-core/00_Base';
import { CdrToken } from '../model/CdrToken';
import { AuthMethod } from '../model/AuthMethod';
import { TokenType } from '../model/TokenType';
import { ChargingPeriod } from '../model/ChargingPeriod';
import { SessionStatus } from '../model/SessionStatus';
import { CdrDimensionType } from '../model/CdrDimensionType';
import { CdrDimension } from '../model/CdrDimension';

@Service()
export class SessionsService {
  constructor() {
  }

  public async getSessions() {
    const transaction: Transaction = new Transaction();
    const startEvent = transaction.transactionEvents?.find(event => event.eventType === TransactionEventEnumType.Started);
    const endEvent = transaction.transactionEvents?.find(event => event.eventType === TransactionEventEnumType.Ended);

    let session: Session = new Session();

    // TODO: CPO needs to provide these values and it somehow needs to be mapped to here
    session.country_code = "CPO_COUNTRY_CODE";
    session.party_id = "CPO_PARTY_ID";

    session.id = transaction.id;
    session.start_date_time = startEvent ? new Date(startEvent.timestamp) : null;
    session.end_date_time = endEvent ? new Date(endEvent.timestamp) : null;

    // TODO: Check whether undefined value is okay here
    session.kwh = transaction.totalKwh;

    session.cdr_token = new CdrToken();
    // TODO: Token Type needs to be derived from somewhere and based on this, uid value would be chosen
    // APP_USER UID is provided by MSP. If during RFID, CPO would use this value to identify the token on their scanner
    session.cdr_token.uid = "";
    session.cdr_token.type = TokenType.OTHER;

    // TODO: All three below needs to be somehow provided from MSP
    session.cdr_token.contract_id = "MSP_CONTRACT_ID";
    session.cdr_token.country_code = "MSP_COUNTRY_CODE";
    session.cdr_token.party_id = "MSP_PARTY_ID";

    // Defaulting to WHITELIST, otherwise Auth support / reservation support needs to be added with MSP
    session.auth_method = AuthMethod.WHITELIST;


    // TODO: Check if station ID can be used for a location ID
    session.location_id = transaction.stationId;
    // TODO: Figure out EVSE UID Mapping
    session.evse_uid = "evse-uid";
    session.connector_id = String(transaction.evse?.connectorId);

    // TODO: Setting it default to USD for now, but this needs to be provided from somewhere
    session.currency = "USD";

    session.charging_periods = transaction.meterValues?.map((meterValue) => {
      const chargingPeriod = new ChargingPeriod();
      chargingPeriod.start_date_time = new Date(meterValue.timestamp);
      chargingPeriod.dimensions = meterValue.sampledValue.map((sampledValue) => {
        const dimension = new CdrDimension();
        // TODO: Need a way to map different types. Maybe from MeasurandEnumType?
        dimension.type = CdrDimensionType.ENERGY;
        dimension.volume = sampledValue.value as number;
        return dimension;
      });
      // TODO: Optional Field
      chargingPeriod.tariff_id = null;
      return chargingPeriod;
    }).sort((a, b) => a.start_date_time < b.start_date_time ? -1 : 1);

    session.status = endEvent ? SessionStatus.COMPLETED : SessionStatus.ACTIVE;
    session.last_updated = new Date();

    // TODO: Optional Field
    session.authorization_reference = null;
    session.total_cost = null;
    session.meter_id = null;

    // let transactions : Transaction[] = await this.transactionRepository.transaction.readAllByQuery({});
    let response: PaginatedSessionResponse = new PaginatedSessionResponse();
    response.data = [session];

    return new PaginatedSessionResponse();
  }
}
