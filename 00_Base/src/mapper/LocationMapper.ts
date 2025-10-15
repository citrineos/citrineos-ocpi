// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { LocationDTO } from '../model/DTO/LocationDTO';
import { EvseDTO, UID_FORMAT } from '../model/DTO/EvseDTO';
import { ConnectorDTO } from '../model/DTO/ConnectorDTO';
import { EvseStatus } from '../model/EvseStatus';
import { ConnectorType } from '../model/ConnectorType';
import { ConnectorFormat } from '../model/ConnectorFormat';
import { PowerType } from '../model/PowerType';
import {
  ChargingStationCapability,
  ChargingStationParkingRestriction,
  ConnectorStatus,
  IChargingStationDto,
  IConnectorDto,
  IEvseDto,
  ILocationDto,
  ConnectorFormatEnum,
  ConnectorPowerType,
  ConnectorTypeEnum,
  LocationParkingType,
  LocationFacilityType,
  LocationHours,
} from '@citrineos/base';
import { ParkingRestriction } from '../model/ParkingRestriction';
import { Capability } from '../model/Capability';
import Container from 'typedi';
import { Logger } from 'tslog';
import { ParkingType } from '../model/ParkingType';
import { Facilities } from '../model/Facilities';
import { Hours } from '../model/Hours';

export class LocationMapper {
  static fromGraphql(location: ILocationDto): LocationDTO {
    return {
      id: location.id!.toString(),
      country_code: location.tenant!.countryCode!,
      party_id: location.tenant!.partyId!,
      publish: location.publishUpstream,
      name: location.name,
      address: location.address,
      city: location.city,
      postal_code: location.postalCode,
      state: location.state,
      country: location.country,
      coordinates: {
        longitude: location.coordinates.coordinates[0].toString(),
        latitude: location.coordinates.coordinates[1].toString(),
      },
      time_zone: location.timeZone,
      evses: location.chargingPool
        ?.map((station) =>
          station.evses?.map((evse) => EvseMapper.fromGraphql(station, evse)),
        )
        ?.flat()
        ?.filter((evse) => evse !== undefined),
      parking_type: LocationMapper.mapLocationParkingType(location.parkingType),
      facilities: location.facilities
        ?.map(LocationMapper.mapLocationFacility)
        .filter((f) => f !== null),
      opening_times: location.openingHours
        ? LocationMapper.mapLocationHours(location.openingHours)
        : undefined,
      last_updated: location.updatedAt!,
    };
  }

  static fromPartialGraphql(
    location: Partial<ILocationDto>,
  ): Partial<LocationDTO> {
    return {
      publish: location.publishUpstream,
      name: location.name,
      address: location.address,
      city: location.city,
      postal_code: location.postalCode,
      state: location.state,
      country: location.country,
      coordinates: location.coordinates && {
        longitude: location.coordinates.coordinates[0].toString(),
        latitude: location.coordinates.coordinates[1].toString(),
      },
      time_zone: location.timeZone,
      evses:
        location.chargingPool &&
        location.chargingPool
          .map((station) =>
            station.evses!.map((evse) => EvseMapper.fromGraphql(station, evse)),
          )
          .flat()
          .filter((evse) => evse !== undefined),
      parking_type: LocationMapper.mapLocationParkingType(location.parkingType),
      facilities: location.facilities
        ?.map(LocationMapper.mapLocationFacility)
        .filter((f) => f !== null),
      opening_times: location.openingHours
        ? LocationMapper.mapLocationHours(location.openingHours)
        : undefined,
      last_updated: location.updatedAt!,
    };
  }

  static mapLocationParkingType(
    parkingType: LocationParkingType | null | undefined,
  ): ParkingType | null {
    switch (parkingType) {
      case LocationParkingType.AlongMotorway:
        return ParkingType.ALONG_MOTORWAY;
      case LocationParkingType.ParkingGarage:
        return ParkingType.PARKING_GARAGE;
      case LocationParkingType.ParkingLot:
        return ParkingType.PARKING_LOT;
      case LocationParkingType.OnDriveway:
        return ParkingType.ON_DRIVEWAY;
      case LocationParkingType.OnStreet:
        return ParkingType.ON_STREET;
      case LocationParkingType.UndergroundGarage:
        return ParkingType.UNDERGROUND_GARAGE;
      default:
        return null;
    }
  }

  static mapLocationFacility(
    locationFacility: LocationFacilityType | null | undefined,
  ): Facilities | null {
    switch (locationFacility) {
      case LocationFacilityType.Hotel:
        return Facilities.HOTEL;
      case LocationFacilityType.Restaurant:
        return Facilities.RESTAURANT;
      case LocationFacilityType.Cafe:
        return Facilities.CAFE;
      case LocationFacilityType.Mall:
        return Facilities.MALL;
      case LocationFacilityType.Supermarket:
        return Facilities.SUPERMARKET;
      case LocationFacilityType.Sport:
        return Facilities.SPORT;
      case LocationFacilityType.RecreationArea:
        return Facilities.RECREATION_AREA;
      case LocationFacilityType.Nature:
        return Facilities.NATURE;
      case LocationFacilityType.Museum:
        return Facilities.MUSEUM;
      case LocationFacilityType.BikeSharing:
        return Facilities.BIKE_SHARING;
      case LocationFacilityType.BusStop:
        return Facilities.BUS_STOP;
      case LocationFacilityType.TaxiStand:
        return Facilities.TAXI_STAND;
      case LocationFacilityType.TramStop:
        return Facilities.TRAM_STOP;
      case LocationFacilityType.MetroStation:
        return Facilities.METRO_STATION;
      case LocationFacilityType.TrainStation:
        return Facilities.TRAIN_STATION;
      case LocationFacilityType.Airport:
        return Facilities.AIRPORT;
      case LocationFacilityType.ParkingLot:
        return Facilities.PARKING_LOT;
      case LocationFacilityType.CarpoolParking:
        return Facilities.CARPOOL_PARKING;
      case LocationFacilityType.FuelStation:
        return Facilities.FUEL_STATION;
      case LocationFacilityType.Wifi:
        return Facilities.WIFI;
      default:
        return null;
    }
  }

  static mapLocationHours(locationHours: LocationHours): Hours {
    return {
      regular_hours: locationHours.regularHours?.map((rh) => {
        return {
          weekday: rh.weekday,
          period_begin: rh.periodBegin,
          period_end: rh.periodEnd,
        };
      }),
      twentyfourseven: locationHours.twentyfourSeven,
      exceptional_openings: locationHours.exceptionalOpenings?.map((eo) => {
        return {
          period_begin: eo.periodBegin,
          period_end: eo.periodEnd,
        };
      }),
      exceptional_closings: locationHours.exceptionalClosings?.map((ec) => {
        return {
          period_begin: ec.periodBegin,
          period_end: ec.periodEnd,
        };
      }),
    };
  }
}

export class EvseMapper {
  static fromGraphql(
    station: IChargingStationDto,
    evse: IEvseDto,
  ): EvseDTO | undefined {
    let connectors = evse
      .connectors?.map(ConnectorMapper.fromGraphql)
      ?.filter((c) => c !== undefined);
    if (!connectors || connectors.length === 0) {
      const logger = Container.get(Logger);
      logger.warn('EVSE has no valid connectors', {
        stationId: station.id,
        evseId: evse.id,
      });
      connectors = undefined;
      // return;
      // TODO: solve this case
    }

    return {
      uid: UID_FORMAT(station.id, evse.id!),
      evse_id: evse.evseId,
      status: connectors ? EvseMapper.mapEvseStatusFromConnectors(
        evse.connectors!.filter((c) =>
          connectors.some((con) => con!.id === c.id!.toString()),
        ),
      ) : EvseStatus.UNKNOWN,
      capabilities: station.capabilities
        ?.map((c) => EvseMapper.mapEvseCapabilities(c))
        .filter((c) => c !== null),
      physical_reference: evse.physicalReference,
      coordinates: station.coordinates
        ? {
            longitude: station.coordinates.coordinates[0].toString(),
            latitude: station.coordinates.coordinates[1].toString(),
          }
        : undefined,
      parking_restrictions: station.parkingRestrictions
        ?.map((r) => EvseMapper.mapEvseParkingRestrictions(r))
        .filter((r) => r !== null),
      connectors: connectors || [],
      floor_level: station.floorLevel,
      last_updated: evse.updatedAt!,
    };
  }

  static fromPartialGraphql(
    station: Partial<IChargingStationDto>,
    evse: Partial<IEvseDto>,
  ): Partial<EvseDTO> {
    const connectors = evse.connectors
      ?.map(ConnectorMapper.fromGraphql)
      .filter((c) => c !== undefined);

    return {
      evse_id: evse.evseId,
      status:
        connectors &&
        EvseMapper.mapEvseStatusFromConnectors(
          evse.connectors!.filter((c) =>
            connectors.some((con) => con!.id === c.id!.toString()),
          ),
        ),
      capabilities: station.capabilities
        ?.map((c) => EvseMapper.mapEvseCapabilities(c))
        .filter((c) => c !== null),
      physical_reference: evse.physicalReference,
      coordinates: station.coordinates
        ? {
            longitude: station.coordinates.coordinates[0].toString(),
            latitude: station.coordinates.coordinates[1].toString(),
          }
        : undefined,
      parking_restrictions: station.parkingRestrictions
        ?.map((r) => EvseMapper.mapEvseParkingRestrictions(r))
        .filter((r) => r !== null),
      connectors: connectors,
      floor_level: station.floorLevel,
      last_updated: evse.updatedAt!,
    };
  }

  static mapEvseStatusFromConnectors(connectors: IConnectorDto[]): EvseStatus {
    if (!connectors || connectors.length === 0) {
      return EvseStatus.UNKNOWN;
    }

    const anyInUse = connectors.some(
      (c) =>
        c.status === ConnectorStatus.Preparing ||
        c.status === ConnectorStatus.Charging ||
        c.status === ConnectorStatus.SuspendedEVSE ||
        c.status === ConnectorStatus.SuspendedEV ||
        c.status === ConnectorStatus.Finishing,
    );
    if (anyInUse) {
      return EvseStatus.CHARGING;
    }
    const anyReserved = connectors.some(
      (c) => c.status === ConnectorStatus.Reserved,
    );
    if (anyReserved) {
      return EvseStatus.RESERVED;
    }
    const anyAvailable = connectors.some(
      (c) => c.status === ConnectorStatus.Available,
    );
    if (anyAvailable) {
      return EvseStatus.AVAILABLE;
    }
    const anyUnavailable = connectors.some(
      (c) => c.status === ConnectorStatus.Unavailable,
    );
    if (anyUnavailable) {
      return EvseStatus.INOPERATIVE;
    }
    const anyFaulted = connectors.some(
      (c) => c.status === ConnectorStatus.Faulted,
    );
    if (anyFaulted) {
      return EvseStatus.OUTOFORDER;
    }

    return EvseStatus.UNKNOWN;
  }

  static mapEvseParkingRestrictions(
    stationRestrictions: ChargingStationParkingRestriction,
  ): ParkingRestriction | null {
    switch (stationRestrictions) {
      case ChargingStationParkingRestriction.EVOnly:
        return ParkingRestriction.EV_ONLY;
      case ChargingStationParkingRestriction.Customers:
        return ParkingRestriction.CUSTOMERS;
      case ChargingStationParkingRestriction.Disabled:
        return ParkingRestriction.DISABLED;
      case ChargingStationParkingRestriction.Motorcycles:
        return ParkingRestriction.MOTORCYCLES;
      case ChargingStationParkingRestriction.Plugged:
        return ParkingRestriction.PLUGGED;
      default:
        return null;
    }
  }

  static mapEvseCapabilities(
    stationCapabilities: ChargingStationCapability,
  ): Capability | null {
    switch (stationCapabilities) {
      case ChargingStationCapability.ChargingProfileCapable:
        return Capability.CHARGING_PROFILE_CAPABLE;
      case ChargingStationCapability.ChargingPreferencesCapable:
        return Capability.CHARGING_PREFERENCES_CAPABLE;
      case ChargingStationCapability.ChipCardSupport:
        return Capability.CHIP_CARD_SUPPORT;
      case ChargingStationCapability.ContactlessCardSupport:
        return Capability.CONTACTLESS_CARD_SUPPORT;
      case ChargingStationCapability.CreditCardPayable:
        return Capability.CREDIT_CARD_PAYABLE;
      case ChargingStationCapability.DebitCardPayable:
        return Capability.DEBIT_CARD_PAYABLE;
      case ChargingStationCapability.PEDTerminal:
        return Capability.PED_TERMINAL;
      case ChargingStationCapability.RemoteStartStopCapable:
        return Capability.REMOTE_START_STOP_CAPABLE;
      case ChargingStationCapability.Reservable:
        return Capability.RESERVABLE;
      case ChargingStationCapability.RFIDReader:
        return Capability.RFID_READER;
      case ChargingStationCapability.StartSessionConnectorRequired:
        return Capability.START_SESSION_CONNECTOR_REQUIRED;
      case ChargingStationCapability.TokenGroupCapable:
        return Capability.TOKEN_GROUP_CAPABLE;
      case ChargingStationCapability.UnlockCapable:
        return Capability.UNLOCK_CAPABLE;
      default:
        return null;
    }
  }
}

export class ConnectorMapper {
  static fromGraphql(connector: IConnectorDto): ConnectorDTO | undefined {
    const logger = Container.get(Logger);
    const partialConnector: Partial<ConnectorDTO> = {
      id: connector.id?.toString(),
      standard: ConnectorMapper.mapConnectorType(connector.type),
      format: ConnectorMapper.mapConnectorFormat(connector.format),
      power_type: ConnectorMapper.mapConnectorPowerType(connector.powerType),
      max_voltage: connector.maximumVoltage || undefined,
      max_amperage: connector.maximumAmperage || undefined,
      max_electric_power: connector.maximumPowerWatts || undefined,
      tariff_ids: connector.tariffs?.map((t) => t.id!.toString()),
      terms_and_conditions: connector.termsAndConditionsUrl,
      last_updated: connector.updatedAt!,
    };
    if (ConnectorMapper.validatePartialConnector(partialConnector)) {
      return partialConnector as ConnectorDTO;
    }
    logger.warn(`Invalid connector: ${JSON.stringify(partialConnector)}`);
  }

  static fromPartialGraphql(
    connector: Partial<IConnectorDto>,
  ): Partial<ConnectorDTO> {
    const logger = Container.get(Logger);
    const partialConnector: Partial<ConnectorDTO> = {
      standard: ConnectorMapper.mapConnectorType(connector.type),
      format: ConnectorMapper.mapConnectorFormat(connector.format),
      power_type: ConnectorMapper.mapConnectorPowerType(connector.powerType),
      max_voltage: connector.maximumVoltage || undefined,
      max_amperage: connector.maximumAmperage || undefined,
      max_electric_power: connector.maximumPowerWatts || undefined,
      tariff_ids: connector.tariffs?.map((t) => t.id!.toString()),
      terms_and_conditions: connector.termsAndConditionsUrl,
      last_updated: connector.updatedAt!,
    };
    return partialConnector;
  }

  static mapConnectorType(
    connectorType: ConnectorTypeEnum | null | undefined,
  ): ConnectorType | undefined {
    const logger = Container.get(Logger);
    switch (connectorType) {
      case ConnectorTypeEnum.CHAdeMO:
        return ConnectorType.CHADEMO;
      case ConnectorTypeEnum.ChaoJi:
        return ConnectorType.CHAOJI;
      case ConnectorTypeEnum.DomesticA:
        return ConnectorType.DOMESTIC_A;
      case ConnectorTypeEnum.DomesticB:
        return ConnectorType.DOMESTIC_B;
      case ConnectorTypeEnum.DomesticC:
        return ConnectorType.DOMESTIC_C;
      case ConnectorTypeEnum.DomesticF:
        return ConnectorType.DOMESTIC_F;
      case ConnectorTypeEnum.DomesticG:
        return ConnectorType.DOMESTIC_G;
      case ConnectorTypeEnum.DomesticI:
        return ConnectorType.DOMESTIC_I;
      case ConnectorTypeEnum.DomesticJ:
        return ConnectorType.DOMESTIC_J;
      case ConnectorTypeEnum.DomesticL:
        return ConnectorType.DOMESTIC_L;
      case ConnectorTypeEnum.DomesticM:
        return ConnectorType.DOMESTIC_M;
      case ConnectorTypeEnum.DomesticN:
        return ConnectorType.DOMESTIC_N;
      case ConnectorTypeEnum.DomesticO:
        return ConnectorType.DOMESTIC_O;
      case ConnectorTypeEnum.GBTAC:
        return ConnectorType.GBT_AC;
      case ConnectorTypeEnum.GBTDC:
        return ConnectorType.GBT_DC;
      case ConnectorTypeEnum.IEC603092Single16:
        return ConnectorType.IEC_60309_2_single_16;
      case ConnectorTypeEnum.IEC603092Three16:
        return ConnectorType.IEC_60309_2_three_16;
      case ConnectorTypeEnum.IEC603092Three32:
        return ConnectorType.IEC_60309_2_three_32;
      case ConnectorTypeEnum.IEC603092Three64:
        return ConnectorType.IEC_60309_2_three_64;
      case ConnectorTypeEnum.IEC62196T1:
        return ConnectorType.IEC_62196_T1;
      case ConnectorTypeEnum.IEC62196T1COMBO:
        return ConnectorType.IEC_62196_T1_COMBO;
      case ConnectorTypeEnum.IEC62196T2:
        return ConnectorType.IEC_62196_T2;
      case ConnectorTypeEnum.IEC62196T2COMBO:
        return ConnectorType.IEC_62196_T2_COMBO;
      case ConnectorTypeEnum.IEC62196T3A:
        return ConnectorType.IEC_62196_T3A;
      case ConnectorTypeEnum.IEC62196T3C:
        return ConnectorType.IEC_62196_T3C;
      case ConnectorTypeEnum.NEMA520:
        return ConnectorType.NEMA_5_20;
      case ConnectorTypeEnum.NEMA630:
        return ConnectorType.NEMA_6_30;
      case ConnectorTypeEnum.NEMA650:
        return ConnectorType.NEMA_6_50;
      case ConnectorTypeEnum.NEMA1030:
        return ConnectorType.NEMA_10_30;
      case ConnectorTypeEnum.NEMA1050:
        return ConnectorType.NEMA_10_50;
      case ConnectorTypeEnum.NEMA1430:
        return ConnectorType.NEMA_14_30;
      case ConnectorTypeEnum.NEMA1450:
        return ConnectorType.NEMA_14_50;
      case ConnectorTypeEnum.PantographBottomUp:
        return ConnectorType.PANTOGRAPH_BOTTOM_UP;
      case ConnectorTypeEnum.PantographTopDown:
        return ConnectorType.PANTOGRAPH_TOP_DOWN;
      case ConnectorTypeEnum.TeslaR:
        return ConnectorType.TESLA_R;
      case ConnectorTypeEnum.TeslaS:
        return ConnectorType.TESLA_S;
      default:
        logger.warn(`Unknown ConnectorType ${connectorType}`);
        return undefined;
    }
  }

  static mapConnectorFormat(
    connectorFormat: ConnectorFormatEnum | null | undefined,
  ): ConnectorFormat | undefined {
    const logger = Container.get(Logger);
    switch (connectorFormat) {
      case ConnectorFormatEnum.Cable:
        return ConnectorFormat.CABLE;
      case ConnectorFormatEnum.Socket:
        return ConnectorFormat.SOCKET;
      default:
        logger.warn(`Unknown Format ${connectorFormat}`);
        return undefined;
    }
  }

  static mapConnectorPowerType(
    connectorPowerType: ConnectorPowerType | null | undefined,
  ): PowerType | undefined {
    const logger = Container.get(Logger);
    switch (connectorPowerType) {
      case ConnectorPowerType.AC1Phase:
        return PowerType.AC_1_PHASE;
      case ConnectorPowerType.AC2Phase:
        return PowerType.AC_2_PHASE;
      case ConnectorPowerType.AC2PhaseSplit:
        return PowerType.AC_2_PHASE_SPLIT;
      case ConnectorPowerType.AC3Phase:
        return PowerType.AC_3_PHASE;
      case ConnectorPowerType.DC:
        return PowerType.DC;
      default:
        logger.warn(`Unknown PowerType ${connectorPowerType}`);
        return undefined;
    }
  }

  static validatePartialConnector(partialConnector: Partial<ConnectorDTO>) {
    if (
      !partialConnector.id ||
      !partialConnector.standard ||
      !partialConnector.format ||
      !partialConnector.power_type ||
      !partialConnector.max_voltage ||
      !partialConnector.max_amperage ||
      !partialConnector.last_updated
    ) {
      const logger = Container.get(Logger);
      logger.warn('Connector is missing required fields, skipping', {
        connector: partialConnector,
      });
      return false;
    }
    return true;
  }
}
