import { Service } from 'typedi';
import { Cdr } from '../model/Cdr';
import { Session } from '../model/Session';
import { SequelizeLocationRepository, SequelizeTariffRepository, Tariff, Transaction } from '@citrineos/data';
import { Tariff as OcpiTariff } from '../model/Tariff';
import { SessionMapper } from './session.mapper';
import { OcpiLogger } from '../util/logger';
import { CdrLocation } from '../model/CdrLocation';
import { TransactionEventRequest } from '@citrineos/base';
import { Price } from '../model/Price';
import { SignedData } from '../model/SignedData';
import { LocationDTO } from '../model/DTO/LocationDTO';

@Service()
export class CdrMapper {
  constructor(
    readonly sessionMapper: SessionMapper,
    readonly logger: OcpiLogger,
    readonly locationRepository: SequelizeLocationRepository,
    readonly tariffRepository: SequelizeTariffRepository
  ) {
  }

  public async mapTransactionsToCdrs(
    transactions: Transaction[],
    fromCountryCode?: string,
    fromPartyId?: string,
    toCountryCode?: string,
    toPartyId?: string
  ): Promise<Cdr[]> {
    try {
      const validTransactions = this.getCompletedTransactions(transactions);
      const transactionIdToTariffMap: Map<string, Tariff> = await this.getTariffsForTransactions(validTransactions);
      const sessions = await this.mapTransactionsToSessions(validTransactions, fromCountryCode, fromPartyId, toCountryCode, toPartyId);
      return await this.mapSessionsToCDRs(sessions, transactionIdToTariffMap);
    } catch (error) {
      // TODO: Handle Error
      throw new Error();
    }
  }

  private async getTariffsForTransactions(transactions: Transaction[]): Promise<Map<string, Tariff>> {
    const transactionIdToTariffMap = new Map<string, Tariff>();
    await Promise.all(transactions.map(async transaction => {
      const tariff = await this.tariffRepository.findByStationId(transaction.stationId);
      if (tariff) {
        transactionIdToTariffMap.set(transaction.id, tariff);
      }
    }));
    return transactionIdToTariffMap;
  }

  private async mapTransactionsToSessions(
    transactions: Transaction[],
    fromCountryCode?: string,
    fromPartyId?: string,
    toCountryCode?: string,
    toPartyId?: string
  ): Promise<Session[]> {
    return this.sessionMapper.mapTransactionsToSessions(
      transactions,
      fromCountryCode,
      fromPartyId,
      toCountryCode,
      toPartyId
    );
  }

  private async mapSessionsToCDRs(sessions: Session[], transactionIdToTariffMap: Map<string, Tariff>): Promise<Cdr[]> {
    return Promise.all(sessions.filter(session => transactionIdToTariffMap.has(session.id)).map(session => this.mapSessionToCDR(session, transactionIdToTariffMap.get(session.id)!)));
  }

  private async mapSessionToCDR(session: Session, tariff: Tariff): Promise<Cdr> {
    // TODO: Get LocationDTO from location service
    const location = new LocationDTO();

    return {
      country_code: session.country_code,
      party_id: session.party_id,
      id: this.generateCdrId(session),
      start_date_time: session.start_date_time,
      end_date_time: session.end_date_time!,
      session_id: session.id,
      cdr_token: session.cdr_token,
      auth_method: session.auth_method,
      authorization_reference: session.authorization_reference,
      cdr_location: await this.createCdrLocation(location, session),
      meter_id: session.meter_id,
      currency: session.currency,
      // TODO: Map OCPP Tariff to OCPI Tariff
      tariffs: [tariff as unknown as OcpiTariff],
      charging_periods: session.charging_periods || [],
      signed_data: await this.getSignedData(session),
      total_cost: await this.calculateTotalCost(session.kwh, tariff.price),
      total_fixed_cost: await this.calculateTotalFixedCost(tariff),
      total_energy: session.kwh,
      total_energy_cost: await this.calculateTotalEnergyCost(session, tariff),
      total_time: this.calculateTotalTime(session),
      total_time_cost: await this.calculateTotalTimeCost(session, tariff),
      total_parking_time: await this.calculateTotalParkingTime(session),
      total_parking_cost: await this.calculateTotalParkingCost(session, tariff),
      total_reservation_cost: await this.calculateTotalReservationCost(session, tariff),
      remark: this.generateRemark(session),
      invoice_reference_id: await this.generateInvoiceReferenceId(session),
      credit: this.isCredit(session, tariff),
      credit_reference_id: this.generateCreditReferenceId(session, tariff),
      last_updated: session.last_updated,
    };
  }

  private generateCdrId(session: Session): string {
    return `CDR-${session.id}-${Date.now()}`;
  }

  private async createCdrLocation(location: LocationDTO, session: Session): Promise<CdrLocation> {
    // TODO: Implement proper mapping from location and session to CdrLocation
    return {
      id: location.id,
      name: location.name,
      address: location.address,
      city: location.city,
      postal_code: location.postal_code,
      country: location.country,
      coordinates: location.coordinates,
      evse_uid: session.evse_uid,
      evse_id: session.evse_uid,
      connector_id: session.connector_id,
      connector_standard: this.getConnectorStandard(location, session),
      connector_format: this.getConnectorFormat(location, session),
      connector_power_type: this.getConnectorPowerType(location, session),
    };
  }

  private getConnectorStandard(location: LocationDTO, session: Session): string {
    const evseDto = location.evses?.find(evse => evse.uid === session.evse_uid);
    const connectorDto = evseDto?.connectors.find(connector => connector.id === session.connector_id);
    return connectorDto?.standard || '';
  }

  private getConnectorFormat(location: LocationDTO, session: Session): string {
    const evseDto = location.evses?.find(evse => evse.uid === session.evse_uid);
    const connectorDto = evseDto?.connectors.find(connector => connector.id === session.connector_id);
    return connectorDto?.format || '';
  }

  private getConnectorPowerType(location: LocationDTO, session: Session): string {
    const evseDto = location.evses?.find(evse => evse.uid === session.evse_uid);
    const connectorDto = evseDto?.connectors.find(connector => connector.id === session.connector_id);
    return connectorDto?.power_type || '';
  }

  private async getSignedData(session: Session): Promise<SignedData | undefined> {
    // TODO: Implement signed data logic if required
    return undefined;
  }

  private async calculateTotalCost(totalKwh: number, tariffCost: number): Promise<Price> {
    return {
      excl_vat: Math.floor(totalKwh * tariffCost * 100) / 100,
    };
  }

  private async calculateTotalFixedCost(tariff: any): Promise<Price | undefined> {
    // TODO: Return total fixed cost if needed
    return undefined;
  }

  private async calculateTotalEnergyCost(session: Session, tariff: Tariff): Promise<Price | undefined> {
    // TODO: Return total energy cost if needed
    return undefined;
  }

  private calculateTotalTime(session: Session): number {
    if (session.end_date_time) {
      return (session.end_date_time.getTime() - session.start_date_time.getTime()) / 3600000; // Convert ms to hours
    }
    return 0;
  }

  private async calculateTotalTimeCost(session: Session, tariff: Tariff): Promise<Price | undefined> {
    // TODO: Return total time cost if needed
    return undefined;
  }

  private async calculateTotalParkingTime(session: Session): Promise<number> {
    // TODO: Return total parking time if needed
    return 0;
  }

  private async calculateTotalParkingCost(session: Session, tariff: Tariff): Promise<Price | undefined> {
    // TODO: Return total parking cost if needed
    return undefined;
  }

  private async calculateTotalReservationCost(session: Session, tariff: Tariff): Promise<Price | undefined> {
    // TODO: Return total reservation cost if needed
    return undefined;
  }

  private generateRemark(session: Session): string | undefined {
    // TODO: Generate remark based on session details if needed
    return undefined;
  }

  private async generateInvoiceReferenceId(session: Session): Promise<string | undefined> {
    // TODO: Generate invoice reference ID if needed
    return undefined;
  }

  private isCredit(session: Session, tariff: Tariff): boolean | undefined {
    // TODO: Return whether CDR is a Credit CDR if needed
    return undefined;
  }

  private generateCreditReferenceId(session: Session, tariff: Tariff): string | undefined {
    // TODO: Return Credit Reference ID for Credit CDR if needed
    return undefined;
  }

  private getCompletedTransactions(transactions: Transaction[]): Transaction[] {
    return transactions.filter(transaction =>
      this.isTransactionComplete(transaction) &&
      this.hasValidEnergy(transaction) &&
      this.hasValidDuration(transaction)
    );
  }

  private isTransactionComplete(transaction: Transaction): boolean {
    return transaction.transactionEvents?.some(event => event.eventType === 'Ended') ?? false;
  }

  private hasValidEnergy(transaction: Transaction): boolean {
    return (transaction.totalKwh ?? 0) > 0;
  }

  private hasValidDuration(transaction: Transaction): boolean {
    const [startEvent, endEvent] = this.getStartAndEndEvents(transaction);
    if (startEvent && endEvent) {
      const duration = new Date(endEvent.timestamp).getTime() - new Date(startEvent.timestamp).getTime();
      return duration > 0;
    }
    return false;
  }

  private getStartAndEndEvents(transaction: Transaction): [TransactionEventRequest | undefined, TransactionEventRequest | undefined] {
    const startEvent = transaction.transactionEvents?.find(event => event.eventType === 'Started');
    const endEvent = transaction.transactionEvents?.find(event => event.eventType === 'Ended');
    return [startEvent, endEvent];
  }
}