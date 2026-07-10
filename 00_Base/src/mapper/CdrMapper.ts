// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { Service } from 'typedi';
import type { Session } from '../model/Session.js';
import { SessionMapper } from './SessionMapper.js';
import type { CdrLocation } from '../model/CdrLocation.js';
import type { Price } from '../model/Price.js';
import type { Tariff as OcpiTariff } from '../model/Tariff.js';
import type { SignedData } from '../model/SignedData.js';
import type { LocationDTO } from '../model/DTO/LocationDTO.js';
import { BaseTransactionMapper } from './BaseTransactionMapper.js';
import type { ILogObj } from 'tslog';
import { Logger } from 'tslog';
import { OcpiGraphqlClient } from '../graphql/index.js';
import { LocationsService } from '../services/LocationsService.js';
import type { TariffDto, TransactionDto } from '@zetra/citrineos-base';
import type { CdrDTO, CdrEntity } from '../model/DTO/CdrDTO.js';

@Service()
export class CdrMapper extends BaseTransactionMapper {
  constructor(
    protected logger: Logger<ILogObj>,
    protected locationsService: LocationsService,
    protected ocpiGraphqlClient: OcpiGraphqlClient,
    readonly sessionMapper: SessionMapper,
  ) {
    super(logger, locationsService, ocpiGraphqlClient);
  }

  public async mapTransactionsToCdrs(
    transactions: TransactionDto[],
  ): Promise<CdrDTO[]> {
    try {
      const validTransactions = this.getCompletedTransactions(transactions);

      const sessions = await this.mapTransactionsToSessions(validTransactions);

      const [transactionIdToTariffMap, transactionIdToLocationMap] =
        await Promise.all([
          this.getTariffsForTransactions(validTransactions),
          this.getLocationDTOsForTransactions(transactions),
        ]);
      const transactionIdToOcpiTariffMap: Map<string, OcpiTariff> =
        await this.getOcpiTariffsForTransactions(
          sessions,
          transactionIdToTariffMap,
        );
      return await this.mapSessionsToCDRs(
        sessions,
        transactionIdToLocationMap,
        transactionIdToTariffMap,
        transactionIdToOcpiTariffMap,
      );
    } catch (error) {
      // Log the original error for debugging
      this.logger.error('Error mapping transactions to CDRs', { error });

      // Preserve the original error context while providing a clear message
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to map transactions to CDRs: ${errorMessage}`);
    }
  }

  private async mapTransactionsToSessions(
    transactions: TransactionDto[],
  ): Promise<Session[]> {
    return this.sessionMapper.mapTransactionsToSessions(transactions);
  }

  private async mapSessionsToCDRs(
    sessions: Session[],
    transactionIdToLocationMap: Map<string, LocationDTO>,
    transactionIdToTariffMap: Map<string, TariffDto>,
    transactionIdToOcpiTariffMap: Map<string, OcpiTariff>,
  ): Promise<CdrDTO[]> {
    return Promise.all(
      sessions
        .filter((session) => transactionIdToTariffMap.has(session.id))
        .map((session) =>
          this.mapSessionToCDR(
            session,
            transactionIdToLocationMap.get(session.id)!,
            transactionIdToTariffMap.get(session.id)!,
            transactionIdToOcpiTariffMap.get(session.id)!,
          ),
        ),
    );
  }

  private async mapSessionToCDR(
    session: Session,
    location: LocationDTO,
    tariff: TariffDto,
    ocpiTariff: OcpiTariff,
  ): Promise<CdrDTO> {
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
      tariffs: [ocpiTariff],
      charging_periods: session.charging_periods || [],
      signed_data: await this.getSignedData(session),
      // TODO: Map based on OCPI Tariff
      total_cost: this.calculateTotalCost(session.kwh, tariff),
      total_fixed_cost: await this.calculateTotalFixedCost(tariff),
      total_energy: session.kwh,
      total_energy_cost: await this.calculateTotalEnergyCost(session, tariff),
      total_time: this.calculateTotalTime(session),
      total_time_cost: await this.calculateTotalTimeCost(session, tariff),
      total_parking_time: await this.calculateTotalParkingTime(session),
      total_parking_cost: await this.calculateTotalParkingCost(session, tariff),
      total_reservation_cost: await this.calculateTotalReservationCost(
        session,
        tariff,
      ),
      remark: this.generateRemark(session),
      invoice_reference_id: await this.generateInvoiceReferenceId(session),
      credit: this.isCredit(session, tariff),
      credit_reference_id: this.generateCreditReferenceId(session, tariff),
      last_updated: session.last_updated,
    };
  }

  private generateCdrId(session: Session): string {
    return session.id;
  }

  private async createCdrLocation(
    location: LocationDTO,
    session: Session,
  ): Promise<CdrLocation> {
    return {
      id: location.id,
      name: location.name,
      address: location.address,
      city: location.city,
      postal_code: location.postal_code,
      country: location.country,
      coordinates: location.coordinates,
      evse_uid: session.evse_uid,
      evse_id: this.getEvseId(session.evse_uid, location),
      connector_id: session.connector_id,
      connector_standard: this.getConnectorStandard(location, session),
      connector_format: this.getConnectorFormat(location, session),
      connector_power_type: this.getConnectorPowerType(location, session),
    };
  }

  private getEvseId(evseUid: string, location: LocationDTO): string {
    return location.evses?.find((evse) => evse.uid === evseUid)?.evse_id ?? '';
  }

  private getConnectorStandard(
    location: LocationDTO,
    session: Session,
  ): string {
    const evseDto = location.evses?.find(
      (evse) => evse.uid === session.evse_uid,
    );
    const connectorDto = evseDto?.connectors.find(
      (connector) => connector.id === session.connector_id,
    );
    return connectorDto?.standard || '';
  }

  private getConnectorFormat(location: LocationDTO, session: Session): string {
    const evseDto = location.evses?.find(
      (evse) => evse.uid === session.evse_uid,
    );
    const connectorDto = evseDto?.connectors.find(
      (connector) => connector.id === session.connector_id,
    );
    return connectorDto?.format || '';
  }

  private getConnectorPowerType(
    location: LocationDTO,
    session: Session,
  ): string {
    const evseDto = location.evses?.find(
      (evse) => evse.uid === session.evse_uid,
    );
    const connectorDto = evseDto?.connectors.find(
      (connector) => connector.id === session.connector_id,
    );
    return connectorDto?.power_type || '';
  }

  private async getSignedData(
    _session: Session,
  ): Promise<SignedData | undefined> {
    // TODO: Implement signed data logic if required
    return undefined;
  }

  private async calculateTotalFixedCost(
    _tariff: any,
  ): Promise<Price | undefined> {
    // TODO: Return total fixed cost if needed
    return undefined;
  }

  private async calculateTotalEnergyCost(
    _session: Session,
    _tariff: TariffDto,
  ): Promise<Price | undefined> {
    // TODO: Return total energy cost if needed
    return undefined;
  }

  private calculateTotalTime(session: Session): number {
    if (session.end_date_time) {
      return (
        (session.end_date_time.getTime() - session.start_date_time.getTime()) /
        3600000
      ); // Convert ms to hours
    }
    return 0;
  }

  private async calculateTotalTimeCost(
    _session: Session,
    _tariff: TariffDto,
  ): Promise<Price | undefined> {
    // TODO: Return total time cost if needed
    return undefined;
  }

  private async calculateTotalParkingTime(_session: Session): Promise<number> {
    // TODO: Return total parking time if needed
    return 0;
  }

  private async calculateTotalParkingCost(
    _session: Session,
    _tariff: TariffDto,
  ): Promise<Price | undefined> {
    // TODO: Return total parking cost if needed
    return undefined;
  }

  private async calculateTotalReservationCost(
    _session: Session,
    _tariff: TariffDto,
  ): Promise<Price | undefined> {
    // TODO: Return total reservation cost if needed
    return undefined;
  }

  private generateRemark(_session: Session): string | undefined {
    // TODO: Generate remark based on session details if needed
    return undefined;
  }

  private async generateInvoiceReferenceId(
    _session: Session,
  ): Promise<string | undefined> {
    // TODO: Generate invoice reference ID if needed
    return undefined;
  }

  private isCredit(_session: Session, _tariff: TariffDto): boolean | undefined {
    // TODO: Return whether CDR is a Credit CDR if needed
    return undefined;
  }

  private generateCreditReferenceId(
    _session: Session,
    _tariff: TariffDto,
  ): string | undefined {
    // TODO: Return Credit Reference ID for Credit CDR if needed
    return undefined;
  }

  private getCompletedTransactions(
    transactions: TransactionDto[],
  ): TransactionDto[] {
    return transactions.filter((transaction) => !transaction.isActive);
  }

  private optional<T>(value: T | null | undefined): T | undefined {
    return value ?? undefined;
  }

  public mapCdrReceiver(entity: CdrEntity): CdrDTO {
    return {
      country_code: entity.countryCode,
      party_id: entity.partyId,
      id: entity.ocpiCdrId,
      start_date_time: entity.startDateTime,
      end_date_time: entity.endDateTime,
      session_id: this.optional(entity.sessionId),

      cdr_token: {
        country_code: entity.cdrToken.country_code,
        party_id: entity.cdrToken.party_id,
        uid: entity.cdrToken.uid,
        type: entity.cdrToken.type,
        contract_id: entity.cdrToken.contract_id,
      },

      auth_method: entity.authMethod,

      authorization_reference: this.optional(entity.authorizationReference),

      cdr_location: {
        id: entity.cdrLocation.id,
        name: this.optional(entity.cdrLocation.name),
        address: entity.cdrLocation.address,
        city: entity.cdrLocation.city,
        postal_code: this.optional(entity.cdrLocation.postal_code),
        state: this.optional(entity.cdrLocation.state),
        country: entity.cdrLocation.country,
        coordinates: {
          latitude: entity.cdrLocation.coordinates.latitude,
          longitude: entity.cdrLocation.coordinates.longitude,
        },
        evse_uid: entity.cdrLocation.evse_uid,
        evse_id: entity.cdrLocation.evse_id,
        connector_id: entity.cdrLocation.connector_id,
        connector_standard: entity.cdrLocation.connector_standard,
        connector_format: entity.cdrLocation.connector_format,
        connector_power_type: entity.cdrLocation.connector_power_type,
      },

      meter_id: this.optional(entity.meterId),
      currency: entity.currency,

      tariffs: entity.tariffs.map((t) => ({
        country_code: t.country_code,
        party_id: t.party_id,
        id: t.id,
        currency: t.currency,
        elements: t.elements,
        last_updated: new Date(t.last_updated),
      })),

      charging_periods: entity.chargingPeriods.map((cp) => ({
        start_date_time: cp.start_date_time,
        dimensions: cp.dimensions,
        tariff_id: this.optional(cp.tariff_id),
      })),

      signed_data: this.optional(entity.signedData),

      total_cost: entity.totalCost,
      total_fixed_cost: this.optional(entity.totalFixedCost),
      total_energy: entity.totalEnergy,
      total_energy_cost: this.optional(entity.totalEnergyCost),
      total_time: entity.totalTime,
      total_time_cost: this.optional(entity.totalTimeCost),
      total_parking_time: this.optional(entity.totalParkingTime),
      total_parking_cost: this.optional(entity.totalParkingCost),
      total_reservation_cost: this.optional(entity.totalReservationCost),

      remark: this.optional(entity.remark),
      invoice_reference_id: this.optional(entity.invoiceReferenceId),
      credit: this.optional(entity.credit),
      credit_reference_id: this.optional(entity.creditReferenceId),
      home_charging_compensation: this.optional(
        entity.homeChargingCompensation,
      ),

      last_updated: entity.lastUpdated,
    };
  }
}
