// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import type { LocationDTO } from '../model/DTO/LocationDTO.js';
import type { EvseDTO } from '../model/DTO/EvseDTO.js';
import { UID_FORMAT } from '../model/DTO/EvseDTO.js';
import type { ConnectorDTO } from '../model/DTO/ConnectorDTO.js';
import { EvseStatus } from '../model/EvseStatus.js';
import { ConnectorType } from '../model/ConnectorType.js';
import { ConnectorFormat } from '../model/ConnectorFormat.js';
import { PowerType } from '../model/PowerType.js';
import {
  type ChargingStationParkingRestrictionEnumType,
  type ChargingStationCapabilityEnumType,
  type ConnectorFormatEnumType,
  type ConnectorPowerTypeEnumType,
  type ConnectorTypeEnumType,
  type ChargingStationDto,
  type ConnectorDto,
  type EvseDto,
  type LocationDto,
  type LocationFacilityEnumType,
  type LocationParkingEnumType,
  type TenantPartnerDto,
  type RoamingPartnerDto,
} from '@zetra/citrineos-base';
import {
  ChargingStationCapabilityEnum,
  ChargingStationParkingRestrictionEnum,
  ConnectorFormatEnum,
  ConnectorPowerTypeEnum,
  ConnectorStatusEnum,
  ConnectorTypeEnum,
  LocationFacilityEnum,
  LocationHours,
  LocationParkingEnum,
} from '@zetra/citrineos-base';
import type { BusinessDetails } from '../model/BusinessDetails.js';
import { ParkingRestriction } from '../model/ParkingRestriction.js';
import { Capability } from '../model/Capability.js';
import { Container } from 'typedi';
import { Logger } from 'tslog';
import { ParkingType } from '../model/ParkingType.js';
import { Facilities } from '../model/Facilities.js';
import type { Hours } from '../model/Hours.js';
import { ImageType } from '../model/ImageType.js';
import { ImageCategory } from '../model/ImageCategory.js';
import type { ImageDTO } from '../model/DTO/ImageDTO.js';
import type { PublishTokenType } from '../model/PublishTokenType.js';

import type {
  GetLocationByOcpiIdAndPartnerIdQueryResult,
  GetEvseByOcpiIdAndPartnerIdQueryResult,
} from '../graphql/operations.js';
export type LocationReceiverDTO =
  GetLocationByOcpiIdAndPartnerIdQueryResult['Locations'][number];
export type EvseReceiverDTO =
  GetEvseByOcpiIdAndPartnerIdQueryResult['Evses'][number];

export class LocationMapper {
  static mapBusinessDetails(
    details: LocationDTO['operator'],
  ): BusinessDetails | null | undefined {
    if (details == null) return details;
    return {
      name: details.name,
      website: details.website ?? undefined,
      logo: details.logo
        ? {
            url: details.logo.url,
            type: details.logo.type as ImageType,
            category: details.logo.category as ImageCategory,
            width: details.logo.width ?? undefined,
            height: details.logo.height ?? undefined,
            thumbnail: details.logo.thumbnail ?? undefined,
          }
        : undefined,
    };
  }

  static fromGraphql(location: LocationDto): LocationDTO {
    return {
      id: location.id!.toString(),
      country_code: location.tenant!.countryCode!,
      party_id: location.tenant!.partyId!,
      publish: location.publishUpstream,
      name: location.name,
      address: location.address,
      city: location.city,
      postal_code: location.postalCode,
      ...(location.state != null && {
        state: location.state,
      }),
      country: location.country,
      coordinates: {
        latitude: location.coordinates.coordinates[0].toString(),
        longitude: location.coordinates.coordinates[1].toString(),
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

  static fromGraphqlReceiver(
    location: LocationReceiverDTO,
    tenantPartner: TenantPartnerDto,
    roamingPartner: RoamingPartnerDto | null,
  ): LocationDTO {
    return {
      id: location.ocpiId!,
      country_code: roamingPartner?.countryCode ?? tenantPartner.countryCode!,
      party_id: roamingPartner?.partyId ?? tenantPartner.partyId!,
      publish: location.publishUpstream ?? false,
      name: location.name,
      address: location.address ?? '',
      city: location.city ?? '',
      postal_code: location.postalCode,
      state: location.state ?? '',
      country: location.country ?? '',
      parking_type: location.parkingType as ParkingType | null,
      directions: location.directions ?? [],
      coordinates: {
        longitude: location.coordinates.coordinates[0].toString(),
        latitude: location.coordinates.coordinates[1].toString(),
      },
      time_zone: location.timeZone ?? '',
      energy_mix: location.energyMix,
      related_locations: location.relatedLocations ?? undefined,
      evses: location.chargingPool
        ?.map((station) =>
          station.evses?.map((evse) => EvseMapper.fromGraphqlReceiver(evse)),
        )
        ?.flat()
        ?.filter((evse) => evse !== undefined),
      facilities: location.facilities as Facilities[] | null,
      images: location.images as ImageDTO[] | null,
      opening_times: location.openingHours as Hours | null,
      charging_when_closed: location.chargingWhenClosed as boolean | null,
      operator: LocationMapper.mapBusinessDetails(location.operator),
      suboperator: LocationMapper.mapBusinessDetails(location.suboperator),
      owner: LocationMapper.mapBusinessDetails(location.owner),
      publish_allowed_to: location.publishAllowedTo as
        | PublishTokenType[]
        | null,
      last_updated: location.updatedAt!,
    };
  }

  static fromPartialGraphql(
    location: Partial<LocationDto>,
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
    parkingType: LocationParkingEnumType | null | undefined,
  ): ParkingType | null {
    switch (parkingType) {
      case LocationParkingEnum.AlongMotorway:
        return ParkingType.ALONG_MOTORWAY;
      case LocationParkingEnum.ParkingGarage:
        return ParkingType.PARKING_GARAGE;
      case LocationParkingEnum.ParkingLot:
        return ParkingType.PARKING_LOT;
      case LocationParkingEnum.OnDriveway:
        return ParkingType.ON_DRIVEWAY;
      case LocationParkingEnum.OnStreet:
        return ParkingType.ON_STREET;
      case LocationParkingEnum.UndergroundGarage:
        return ParkingType.UNDERGROUND_GARAGE;
      default:
        return null;
    }
  }

  static mapLocationFacility(
    locationFacility: LocationFacilityEnumType | null | undefined,
  ): Facilities | null {
    switch (locationFacility) {
      case LocationFacilityEnum.Hotel:
        return Facilities.HOTEL;
      case LocationFacilityEnum.Restaurant:
        return Facilities.RESTAURANT;
      case LocationFacilityEnum.Cafe:
        return Facilities.CAFE;
      case LocationFacilityEnum.Mall:
        return Facilities.MALL;
      case LocationFacilityEnum.Supermarket:
        return Facilities.SUPERMARKET;
      case LocationFacilityEnum.Sport:
        return Facilities.SPORT;
      case LocationFacilityEnum.RecreationArea:
        return Facilities.RECREATION_AREA;
      case LocationFacilityEnum.Nature:
        return Facilities.NATURE;
      case LocationFacilityEnum.Museum:
        return Facilities.MUSEUM;
      case LocationFacilityEnum.BikeSharing:
        return Facilities.BIKE_SHARING;
      case LocationFacilityEnum.BusStop:
        return Facilities.BUS_STOP;
      case LocationFacilityEnum.TaxiStand:
        return Facilities.TAXI_STAND;
      case LocationFacilityEnum.TramStop:
        return Facilities.TRAM_STOP;
      case LocationFacilityEnum.MetroStation:
        return Facilities.METRO_STATION;
      case LocationFacilityEnum.TrainStation:
        return Facilities.TRAIN_STATION;
      case LocationFacilityEnum.Airport:
        return Facilities.AIRPORT;
      case LocationFacilityEnum.ParkingLot:
        return Facilities.PARKING_LOT;
      case LocationFacilityEnum.CarpoolParking:
        return Facilities.CARPOOL_PARKING;
      case LocationFacilityEnum.FuelStation:
        return Facilities.FUEL_STATION;
      case LocationFacilityEnum.Wifi:
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
    station: ChargingStationDto,
    evse: EvseDto,
  ): EvseDTO | undefined {
    let connectors = evse.connectors
      ?.map(ConnectorMapper.fromGraphql)
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
      status: connectors
        ? EvseMapper.mapEvseStatusFromConnectors(
            evse.connectors!.filter((c) =>
              connectors.some((con) => con!.id === c.id!.toString()),
            ),
          )
        : EvseStatus.UNKNOWN,
      capabilities: station.capabilities
        ?.map((c) => EvseMapper.mapEvseCapabilities(c))
        .filter((c) => c !== null),
      ...(evse.physicalReference != null &&
        evse.physicalReference !== '' && {
          physical_reference: evse.physicalReference,
        }),
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
      ...(station.floorLevel != null && {
        floor_level: station.floorLevel,
      }),
      last_updated: evse.updatedAt!,
    };
  }

  static fromGraphqlReceiver(evse: EvseReceiverDTO): EvseDTO | undefined {
    const stationId = evse.stationId ?? '';
    let connectors = evse.connectors
      ?.map(ConnectorMapper.fromGraphqlReceiver)
      ?.filter((c): c is ConnectorDTO => c !== undefined);
    if (!connectors || connectors.length === 0) {
      const logger = Container.get(Logger);
      logger.warn('EVSE has no valid connectors', { evseId: evse.id });
      connectors = [];
    }

    return {
      uid: evse.ocpiUid ?? UID_FORMAT(stationId, evse.id),
      evse_id: evse.evseId,
      physical_reference: evse.physicalReference,
      connectors,
      floor_level: evse.floorLevel,
      status: (evse.ocpiStatus as EvseStatus) ?? EvseStatus.UNKNOWN,
      status_schedule: evse.statusSchedule?.map(
        (s: { period_begin: string; period_end: string; status: string }) => ({
          period_begin: s.period_begin,
          period_end: s.period_end,
          status: s.status as EvseStatus,
        }),
      ),
      images:
        evse.images?.map(
          (i: {
            url: string;
            type: string;
            category: string;
            thumbnail?: string | null;
            width?: number | null;
            height?: number | null;
          }) => ({
            url: i.url,
            type: i.type as ImageType,
            category: i.category as ImageCategory,
            thumbnail: i.thumbnail ?? undefined,
            width: i.width ?? undefined,
            height: i.height ?? undefined,
          }),
        ) ?? [],
      directions: evse.directions ?? [],
      capabilities: evse.capabilities as Capability[] | null | undefined,
      parking_restrictions: evse.parkingRestrictions as
        | ParkingRestriction[]
        | undefined, // ← no station fallback needed
      coordinates:
        evse.coordinates && evse.coordinates.coordinates?.length === 2
          ? {
              longitude: evse.coordinates.coordinates[0].toString(),
              latitude: evse.coordinates.coordinates[1].toString(),
            }
          : null,
      last_updated: evse.updatedAt!,
    };
  }

  static fromPartialGraphql(
    station: Partial<ChargingStationDto>,
    evse: Partial<EvseDto>,
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

  static mapEvseStatusFromConnectors(connectors: ConnectorDto[]): EvseStatus {
    if (!connectors || connectors.length === 0) {
      return EvseStatus.UNKNOWN;
    }

    const anyInUse = connectors.some(
      (c) =>
        c.status === ConnectorStatusEnum.Preparing ||
        c.status === ConnectorStatusEnum.Charging ||
        c.status === ConnectorStatusEnum.SuspendedEVSE ||
        c.status === ConnectorStatusEnum.SuspendedEV ||
        c.status === ConnectorStatusEnum.Finishing,
    );
    if (anyInUse) {
      return EvseStatus.CHARGING;
    }
    const anyReserved = connectors.some(
      (c) => c.status === ConnectorStatusEnum.Reserved,
    );
    if (anyReserved) {
      return EvseStatus.RESERVED;
    }
    const anyAvailable = connectors.some(
      (c) => c.status === ConnectorStatusEnum.Available,
    );
    if (anyAvailable) {
      return EvseStatus.AVAILABLE;
    }
    const anyUnavailable = connectors.some(
      (c) => c.status === ConnectorStatusEnum.Unavailable,
    );
    if (anyUnavailable) {
      return EvseStatus.INOPERATIVE;
    }
    const anyFaulted = connectors.some(
      (c) => c.status === ConnectorStatusEnum.Faulted,
    );
    if (anyFaulted) {
      return EvseStatus.OUTOFORDER;
    }

    return EvseStatus.UNKNOWN;
  }

  static mapEvseParkingRestrictions(
    stationRestrictions: ChargingStationParkingRestrictionEnumType,
  ): ParkingRestriction | null {
    switch (stationRestrictions) {
      case ChargingStationParkingRestrictionEnum.EVOnly:
        return ParkingRestriction.EV_ONLY;
      case ChargingStationParkingRestrictionEnum.Customers:
        return ParkingRestriction.CUSTOMERS;
      case ChargingStationParkingRestrictionEnum.Disabled:
        return ParkingRestriction.DISABLED;
      case ChargingStationParkingRestrictionEnum.Motorcycles:
        return ParkingRestriction.MOTORCYCLES;
      case ChargingStationParkingRestrictionEnum.Plugged:
        return ParkingRestriction.PLUGGED;
      default:
        return null;
    }
  }

  static mapEvseCapabilities(
    stationCapabilities: ChargingStationCapabilityEnumType,
  ): Capability | null {
    switch (stationCapabilities) {
      case ChargingStationCapabilityEnum.ChargingProfileCapable:
        return Capability.CHARGING_PROFILE_CAPABLE;
      case ChargingStationCapabilityEnum.ChargingPreferencesCapable:
        return Capability.CHARGING_PREFERENCES_CAPABLE;
      case ChargingStationCapabilityEnum.ChipCardSupport:
        return Capability.CHIP_CARD_SUPPORT;
      case ChargingStationCapabilityEnum.ContactlessCardSupport:
        return Capability.CONTACTLESS_CARD_SUPPORT;
      case ChargingStationCapabilityEnum.CreditCardPayable:
        return Capability.CREDIT_CARD_PAYABLE;
      case ChargingStationCapabilityEnum.DebitCardPayable:
        return Capability.DEBIT_CARD_PAYABLE;
      case ChargingStationCapabilityEnum.PEDTerminal:
        return Capability.PED_TERMINAL;
      case ChargingStationCapabilityEnum.RemoteStartStopCapable:
        return Capability.REMOTE_START_STOP_CAPABLE;
      case ChargingStationCapabilityEnum.Reservable:
        return Capability.RESERVABLE;
      case ChargingStationCapabilityEnum.RFIDReader:
        return Capability.RFID_READER;
      case ChargingStationCapabilityEnum.StartSessionConnectorRequired:
        return Capability.START_SESSION_CONNECTOR_REQUIRED;
      case ChargingStationCapabilityEnum.TokenGroupCapable:
        return Capability.TOKEN_GROUP_CAPABLE;
      case ChargingStationCapabilityEnum.UnlockCapable:
        return Capability.UNLOCK_CAPABLE;
      default:
        return null;
    }
  }
}

export class ConnectorMapper {
  static fromGraphql(connector: ConnectorDto): ConnectorDTO | undefined {
    const logger = Container.get(Logger);
    const partialConnector: Partial<ConnectorDTO> = {
      id: connector.id?.toString(),
      standard: ConnectorMapper.mapConnectorType(connector.type),
      format: ConnectorMapper.mapConnectorFormat(connector.format),
      power_type: ConnectorMapper.mapConnectorPowerType(connector.powerType),
      max_voltage: connector.maximumVoltage || undefined,
      max_amperage: connector.maximumAmperage || undefined,
      max_electric_power: connector.maximumPowerWatts || undefined,
      tariff_ids: connector.tariffs?.map(
        (t: any) =>
          t.tariffOcpiId ?? t.Tariff?.ocpiTariffId ?? t.tariffId?.toString(),
      ),
      terms_and_conditions: connector.termsAndConditionsUrl,
      last_updated: connector.updatedAt!,
    };
    if (ConnectorMapper.validatePartialConnector(partialConnector)) {
      return partialConnector as ConnectorDTO;
    }
    logger.warn(`Invalid connector: ${JSON.stringify(partialConnector)}`);
  }

  static fromGraphqlReceiver(connector: any): ConnectorDTO | undefined {
    const partial: Partial<ConnectorDTO> = {
      id: connector.ocpiId ?? connector.id?.toString(),
      standard: connector.type as ConnectorType,
      format: connector.format as ConnectorFormat,
      power_type: connector.powerType as PowerType,
      max_voltage: connector.maximumVoltage || undefined,
      max_amperage: connector.maximumAmperage || undefined,
      max_electric_power: connector.maximumPowerWatts || undefined,
      terms_and_conditions: connector.termsAndConditionsUrl,
      last_updated: connector.updatedAt,
      tariff_ids: connector.tariffs?.map((t: any) => t.tariffOcpiId),
    };
    if (ConnectorMapper.validatePartialConnector(partial)) {
      return partial as ConnectorDTO;
    }
  }

  static fromPartialGraphql(
    connector: Partial<ConnectorDto>,
  ): Partial<ConnectorDTO> {
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
    connectorType: ConnectorTypeEnumType | null | undefined,
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
      //both sides
      // OCPI values already stored in DB → return ConnectorType for API
      case 'CHADEMO':
      case ConnectorType.CHADEMO:
        return ConnectorType.CHADEMO;
      case 'CHAOJI':
      case ConnectorType.CHAOJI:
        return ConnectorType.CHAOJI;
      case 'DOMESTIC_A':
      case ConnectorType.DOMESTIC_A:
        return ConnectorType.DOMESTIC_A;
      case 'DOMESTIC_B':
      case ConnectorType.DOMESTIC_B:
        return ConnectorType.DOMESTIC_B;
      case 'DOMESTIC_C':
      case ConnectorType.DOMESTIC_C:
        return ConnectorType.DOMESTIC_C;
      case 'DOMESTIC_D':
      case ConnectorType.DOMESTIC_D:
        return ConnectorType.DOMESTIC_D;
      case 'DOMESTIC_E':
      case ConnectorType.DOMESTIC_E:
        return ConnectorType.DOMESTIC_E;
      case 'DOMESTIC_F':
      case ConnectorType.DOMESTIC_F:
        return ConnectorType.DOMESTIC_F;
      case 'DOMESTIC_G':
      case ConnectorType.DOMESTIC_G:
        return ConnectorType.DOMESTIC_G;
      case 'DOMESTIC_H':
      case ConnectorType.DOMESTIC_H:
        return ConnectorType.DOMESTIC_H;
      case 'DOMESTIC_I':
      case ConnectorType.DOMESTIC_I:
        return ConnectorType.DOMESTIC_I;
      case 'DOMESTIC_J':
      case ConnectorType.DOMESTIC_J:
        return ConnectorType.DOMESTIC_J;
      case 'DOMESTIC_K':
      case ConnectorType.DOMESTIC_K:
        return ConnectorType.DOMESTIC_K;
      case 'DOMESTIC_L':
      case ConnectorType.DOMESTIC_L:
        return ConnectorType.DOMESTIC_L;
      case 'DOMESTIC_M':
      case ConnectorType.DOMESTIC_M:
        return ConnectorType.DOMESTIC_M;
      case 'DOMESTIC_N':
      case ConnectorType.DOMESTIC_N:
        return ConnectorType.DOMESTIC_N;
      case 'DOMESTIC_O':
      case ConnectorType.DOMESTIC_O:
        return ConnectorType.DOMESTIC_O;
      case 'GBT_AC':
      case ConnectorType.GBT_AC:
        return ConnectorType.GBT_AC;
      case 'GBT_DC':
      case ConnectorType.GBT_DC:
        return ConnectorType.GBT_DC;
      case 'IEC_60309_2_single_16':
      case ConnectorType.IEC_60309_2_single_16:
        return ConnectorType.IEC_60309_2_single_16;
      case 'IEC_60309_2_three_16':
      case ConnectorType.IEC_60309_2_three_16:
        return ConnectorType.IEC_60309_2_three_16;
      case 'IEC_60309_2_three_32':
      case ConnectorType.IEC_60309_2_three_32:
        return ConnectorType.IEC_60309_2_three_32;
      case 'IEC_60309_2_three_64':
      case ConnectorType.IEC_60309_2_three_64:
        return ConnectorType.IEC_60309_2_three_64;
      case 'IEC_62196_T1':
      case ConnectorType.IEC_62196_T1:
        return ConnectorType.IEC_62196_T1;
      case 'IEC_62196_T1_COMBO':
      case ConnectorType.IEC_62196_T1_COMBO:
        return ConnectorType.IEC_62196_T1_COMBO;
      case 'IEC_62196_T2':
      case ConnectorType.IEC_62196_T2:
        return ConnectorType.IEC_62196_T2;
      case 'IEC_62196_T2_COMBO':
      case ConnectorType.IEC_62196_T2_COMBO:
        return ConnectorType.IEC_62196_T2_COMBO;
      case 'IEC_62196_T3A':
      case ConnectorType.IEC_62196_T3A:
        return ConnectorType.IEC_62196_T3A;
      case 'IEC_62196_T3C':
      case ConnectorType.IEC_62196_T3C:
        return ConnectorType.IEC_62196_T3C;
      case 'NEMA_5_20':
      case ConnectorType.NEMA_5_20:
        return ConnectorType.NEMA_5_20;
      case 'NEMA_6_30':
      case ConnectorType.NEMA_6_30:
        return ConnectorType.NEMA_6_30;
      case 'NEMA_6_50':
      case ConnectorType.NEMA_6_50:
        return ConnectorType.NEMA_6_50;
      case 'NEMA_10_30':
      case ConnectorType.NEMA_10_30:
        return ConnectorType.NEMA_10_30;
      case 'NEMA_10_50':
      case ConnectorType.NEMA_10_50:
        return ConnectorType.NEMA_10_50;
      case 'NEMA_14_30':
      case ConnectorType.NEMA_14_30:
        return ConnectorType.NEMA_14_30;
      case 'NEMA_14_50':
      case ConnectorType.NEMA_14_50:
        return ConnectorType.NEMA_14_50;
      case 'PANTOGRAPH_BOTTOM_UP':
      case ConnectorType.PANTOGRAPH_BOTTOM_UP:
        return ConnectorType.PANTOGRAPH_BOTTOM_UP;
      case 'PANTOGRAPH_TOP_DOWN':
      case ConnectorType.PANTOGRAPH_TOP_DOWN:
        return ConnectorType.PANTOGRAPH_TOP_DOWN;
      case 'TESLA_R':
      case ConnectorType.TESLA_R:
        return ConnectorType.TESLA_R;
      case 'TESLA_S':
      case ConnectorType.TESLA_S:
        return ConnectorType.TESLA_S;
      default:
        logger.warn(`Unknown ConnectorType ${connectorType}`);
        return undefined;
    }
  }

  static mapConnectorFormat(
    connectorFormat: ConnectorFormatEnumType | null | undefined,
  ): ConnectorFormat | undefined {
    const logger = Container.get(Logger);
    switch (connectorFormat) {
      case 'Socket':
      case 'SOCKET':
      case ConnectorFormatEnum.Socket:
      case ConnectorFormatEnum.SOCKET:
        return ConnectorFormat.SOCKET;
      case 'Cable':
      case 'CABLE':
      case ConnectorFormatEnum.Cable:
      case ConnectorFormatEnum.CABLE:
        return ConnectorFormat.CABLE;
      default:
        logger.warn(`Unknown Format ${connectorFormat}`);
        return undefined;
    }
  }

  static mapConnectorPowerType(
    connectorPowerType: ConnectorPowerTypeEnumType | null | undefined,
  ): PowerType | undefined {
    const logger = Container.get(Logger);
    switch (connectorPowerType) {
      case ConnectorPowerTypeEnum.AC1Phase:
        return PowerType.AC_1_PHASE;
      case ConnectorPowerTypeEnum.AC2Phase:
        return PowerType.AC_2_PHASE;
      case ConnectorPowerTypeEnum.AC2PhaseSplit:
        return PowerType.AC_2_PHASE_SPLIT;
      case ConnectorPowerTypeEnum.AC3Phase:
        return PowerType.AC_3_PHASE;
      case ConnectorPowerTypeEnum.DC:
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
