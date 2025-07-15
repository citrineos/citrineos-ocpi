import {
  GetLocationsQuery,
  GetLocationByIdQuery,
  GetEvseByIdQuery,
  GetConnectorByIdQuery,
} from '../graphql/types/graphql';
import { LocationDTO } from '../model/DTO/LocationDTO';
import { EvseDTO, UID_FORMAT } from '../model/DTO/EvseDTO';
import { ConnectorDTO } from '../model/DTO/ConnectorDTO';
import { GeoLocation } from '../model/GeoLocation';
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
} from '@citrineos/base';
import { ParkingRestriction } from '../model/ParkingRestriction';
import { Capability } from '../model/Capability';

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
      coordinates: location.coordinates as GeoLocation,
      time_zone: location.timeZone,
      evses: location.chargingPool
        .map((station) =>
          station.evses!.map((evse) => EvseMapper.fromGraphql(station, evse)),
        )
        .flat(),
      last_updated: location.updatedAt!,
    };
  }
}

export class EvseMapper {
  static fromGraphql(station: IChargingStationDto, evse: IEvseDto): EvseDTO {
    return {
      uid: UID_FORMAT(station.id, evse.id!),
      evse_id: evse.evseId,
      status: EvseMapper.mapEvseStatusFromConnectors(evse.connectors!),
      capabilities: station.capabilities
        ?.map((c) => EvseMapper.mapEvseCapabilities(c))
        .filter((c) => c !== null),
      physical_reference: evse.physicalReference,
      coordinates: {
        longitude: station.coordinates!.coordinates[0].toString(),
        latitude: station.coordinates!.coordinates[1].toString(),
      },
      parking_restrictions: station.parkingRestrictions
        ?.map((r) => EvseMapper.mapEvseParkingRestrictions(r))
        .filter((r) => r !== null),
      connectors: evse.connectors!.map(ConnectorMapper.fromGraphql),
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
      case ChargingStationParkingRestriction.EvOnly:
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
      case ChargingStationCapability.PedTerminal:
        return Capability.PED_TERMINAL;
      case ChargingStationCapability.RemoteStartStopCapable:
        return Capability.REMOTE_START_STOP_CAPABLE;
      case ChargingStationCapability.Reservable:
        return Capability.RESERVABLE;
      case ChargingStationCapability.RfidReader:
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
  static fromGraphql(connector: IConnectorDto): ConnectorDTO {
    return {
      id: connector.id!.toString(),
      standard: ConnectorType.IEC_62196_T2, // TODO: Map standard
      format: ConnectorFormat.SOCKET, // TODO: Map format
      power_type: PowerType.AC_3_PHASE, // TODO: Map power_type
      max_voltage: 0, // TODO: Map max_voltage
      max_amperage: 0, // TODO: Map max_amperage
      last_updated: new Date(connector.timestamp),
    };
  }
}
