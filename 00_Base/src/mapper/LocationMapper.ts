import { OcpiLocation, OcpiLocationProps } from '../model/OcpiLocation';
import { LocationDTO } from '../model/DTO/LocationDTO';
import { EvseDTO, UID_FORMAT } from '../model/DTO/EvseDTO';
import { ConnectorDTO, TEMPORARY_CONNECTOR_ID } from '../model/DTO/ConnectorDTO';
import { GeoLocation } from '../model/GeoLocation';
import { Location } from '@citrineos/data';
import { EvseStatus } from '../model/EvseStatus';
import { ConnectorEnumType, ConnectorStatusEnumType } from '@citrineos/base';
import { Capability } from '../model/Capability';
import { ConnectorType } from '../model/ConnectorType';
import { ConnectorFormat } from '../model/ConnectorFormat';
import { PowerType } from '../model/PowerType';
import { ChargingStationVariableAttributes } from '../model/variableattributes/ChargingStationVariableAttributes';
import { EvseVariableAttributes } from '../model/variableattributes/EvseVariableAttributes';
import { OcpiEvse } from '../model/OcpiEvse';
import { ConnectorVariableAttributes } from '../model/variableattributes/ConnectorVariableAttributes';
import { OcpiConnector } from '../model/OcpiConnector';
import { NOT_APPLICABLE } from '../util/Consts';
import { Service } from 'typedi';
import { ILogObj, Logger } from 'tslog';
import { Point } from 'geojson';

@Service()
export class LocationMapper {
  constructor(private logger: Logger<ILogObj>) {}

  static mapConnectorAvailabilityStatesToEvseStatus(
    availabilityStates: string[],
    parkingBayOccupancy?: string,
    evseRemoved?: boolean,
  ): EvseStatus {
    if (parkingBayOccupancy === 'true') {
      return EvseStatus.BLOCKED;
    } else if (evseRemoved) {
      return EvseStatus.REMOVED;
    }

    const uniqueStates = [...new Set(availabilityStates)];

    // TODO handle RESERVED
    if (
      uniqueStates.find((state) => state === ConnectorStatusEnumType.Occupied)
    ) {
      return EvseStatus.CHARGING;
    } else if (
      uniqueStates.find((state) => state === ConnectorStatusEnumType.Available)
    ) {
      return EvseStatus.AVAILABLE;
    } else if (
      uniqueStates.find(
        (state) => state === ConnectorStatusEnumType.Unavailable,
      )
    ) {
      return EvseStatus.INOPERATIVE;
    } else if (
      uniqueStates.length === 1 &&
      uniqueStates[0] === ConnectorStatusEnumType.Faulted
    ) {
      return EvseStatus.OUTOFORDER;
    } else {
      return EvseStatus.UNKNOWN;
    }
  }

  mapToOcpiLocation(
    coreLocation: Location,
    chargingStationVariableAttributesMap: Map<
      string,
      ChargingStationVariableAttributes
    >,
    ocpiLocation: OcpiLocation,
  ): LocationDTO {
    const location = new LocationDTO();

    location.id = coreLocation.id;

    location.country_code = ocpiLocation[OcpiLocationProps.countryCode];
    location.party_id = ocpiLocation[OcpiLocationProps.partyId];
    location.last_updated = ocpiLocation.lastUpdated;
    location.publish = ocpiLocation.publish ?? false;

    // TODO update with dynamic data
    // ocpiLocation.publish_allowed_to

    location.name = coreLocation.name ?? NOT_APPLICABLE;
    location.address = coreLocation.address ?? NOT_APPLICABLE;
    location.city = coreLocation.city ?? NOT_APPLICABLE;
    location.postal_code = coreLocation.postalCode ?? NOT_APPLICABLE;
    location.state = coreLocation.state ?? NOT_APPLICABLE;
    location.country = coreLocation.country ?? NOT_APPLICABLE;
    location.coordinates = this.mapOcppCoordinatesToGeoLocation(
      coreLocation.coordinates,
    );
    location.time_zone = ocpiLocation.timeZone;

    const evses: EvseDTO[] = [];

    for (const chargingStationAttributes of chargingStationVariableAttributesMap.values()) {
      for (const evseAttributes of chargingStationAttributes.evses.values()) {
        const ocpiEvse = ocpiLocation.ocpiEvses.get(
          `${UID_FORMAT(evseAttributes.station_id, evseAttributes.id)}`,
        );

        if (!ocpiEvse) {
          this.logger.warn(
            `OCPI EVSE ${UID_FORMAT(evseAttributes.station_id, evseAttributes.id)} does not exist - will skip.`,
          );
          continue;
        }

        evses.push(
          this.mapToEvseDTO(
            coreLocation,
            chargingStationAttributes,
            evseAttributes,
            ocpiEvse,
          ),
        );
      }
    }

    location.evses = [...evses];

    // TODO make dynamic mappings for the remaining optional fields
    // ocpiLocation.related_locations
    // ocpiLocation.parking_type
    // ocpiLocation.directions
    // ocpiLocation.operator
    // ocpiLocation.suboperator
    // ocpiLocation.owner
    // ocpiLocation.facilities
    // ocpiLocation.charging_when_closed
    // ocpiLocation.images
    // ocpiLocation.energy_mix

    return location;
  }

  mapToEvseDTO(
    citrineLocation: Location,
    chargingStationAttributes: ChargingStationVariableAttributes,
    evseAttributes: EvseVariableAttributes,
    ocpiEvse: OcpiEvse,
  ): EvseDTO {
    const connectorAvailabilityStates = [
      ...evseAttributes.connectors.values(),
    ].map(
      (connectorAttributes) => connectorAttributes.connector_availability_state,
    );

    const evse = new EvseDTO();
    evse.uid = UID_FORMAT(chargingStationAttributes.id, evseAttributes.id);
    evse.status = LocationMapper.mapConnectorAvailabilityStatesToEvseStatus(
      connectorAvailabilityStates,
      chargingStationAttributes.bay_occupancy_sensor_active,
      ocpiEvse.removed,
    );
    evse.evse_id = evseAttributes.evse_id;
    evse.capabilities = this.getCapabilities(
      chargingStationAttributes.authorize_remote_start,
      chargingStationAttributes.token_reader_enabled,
    );
    evse.coordinates = this.mapOcppCoordinatesToGeoLocation(
      citrineLocation.coordinates,
    );
    evse.physical_reference = ocpiEvse.physicalReference;
    evse.last_updated = ocpiEvse.lastUpdated;

    const connectors = [];

    for (const connectorAttributes of evseAttributes.connectors.values()) {
      const ocpiConnector = ocpiEvse.ocpiConnectors.get(
        `${TEMPORARY_CONNECTOR_ID(connectorAttributes.station_id, connectorAttributes.evse_id, Number(connectorAttributes.id))}`,
      );

      if (!ocpiConnector) {
        this.logger.warn(
          `OCPI Connector ${connectorAttributes.id} on EVSE ${UID_FORMAT(evseAttributes.station_id, evseAttributes.id)} does not exist - will skip.`,
        );
        continue;
      }

      connectors.push(
        this.mapToOcpiConnector(
          connectorAttributes.id,
          evseAttributes,
          connectorAttributes,
          ocpiConnector,
        ),
      );
    }

    evse.connectors = [...connectors];

    // TODO make dynamic mappings for the remaining optional fields
    // evse.status_schedule
    // evse.floor_level
    // evse.directions
    // evse.parking_restrictions
    // evse.images

    return evse;
  }

  mapToOcpiConnector(
    id: number,
    evseAttributes: EvseVariableAttributes,
    connectorAttributes: ConnectorVariableAttributes,
    ocpiConnector: OcpiConnector,
  ): ConnectorDTO {
    const ocppConnectorType = connectorAttributes.connector_type;

    const connector = new ConnectorDTO();
    connector.id = String(id);
    connector.last_updated = ocpiConnector.lastUpdated;
    connector.standard = this.getConnectorStandard(ocppConnectorType);
    connector.format = ConnectorFormat.CABLE; // TODO dynamically determine if CABLE Or SOCKET
    connector.power_type = this.getConnectorPowerType(ocppConnectorType);
    connector.max_voltage = Number(evseAttributes.evse_dc_voltage);
    connector.max_amperage = Number(evseAttributes.evse_dc_current);
    connector.max_electric_power = Number(evseAttributes.evse_power);

    // TODO make dynamic mappings for the remaining optional fields
    // connector.tariff_ids
    // connector.terms_and_conditions

    return connector;
  }

  /*
    Helpers
  */

  private mapOcppCoordinatesToGeoLocation(ocppCoordinates: Point): GeoLocation {
    const geoLocation = new GeoLocation();
    geoLocation.longitude = String(ocppCoordinates.coordinates[0]);
    geoLocation.latitude = String(ocppCoordinates.coordinates[1]);
    return geoLocation;
  }

  private getCapabilities(
    authorizeRemoteStart: string,
    tokenReaderEnabled: string,
  ): Capability[] {
    // TODO add remaining capabilities
    const capabilities: Capability[] = [];

    if (authorizeRemoteStart?.toLowerCase() === 'true') {
      capabilities.push(Capability.REMOTE_START_STOP_CAPABLE);
    }
    if (tokenReaderEnabled?.toLowerCase() === 'true') {
      capabilities.push(Capability.RFID_READER);
    }

    return capabilities;
  }

  private getConnectorStandard(
    connectorType: string | undefined,
  ): ConnectorType {
    // TODO determine if mappings are possible for:
    // s309-1P-32A
    // sBS1361
    // sCEE-7-7
    // Other1PhMax16A
    // Other1PhOver16A
    // Other3Ph
    // Pan
    // wInductive
    // wResonant
    switch (connectorType) {
      case ConnectorEnumType.cCCS1:
        return ConnectorType.IEC_62196_T1_COMBO;
      case ConnectorEnumType.cCCS2:
        return ConnectorType.IEC_62196_T2_COMBO;
      case ConnectorEnumType.cG105:
        return ConnectorType.CHADEMO;
      case ConnectorEnumType.cTesla:
        return ConnectorType.TESLA_S;
      case ConnectorEnumType.cType1:
        return ConnectorType.IEC_62196_T1;
      case ConnectorEnumType.cType2:
      case ConnectorEnumType.sType2:
        return ConnectorType.IEC_62196_T2;
      case ConnectorEnumType.s309_1P_16A:
        return ConnectorType.IEC_60309_2_single_16;
      case ConnectorEnumType.s309_3P_16A:
        return ConnectorType.IEC_60309_2_three_16;
      case ConnectorEnumType.s309_3P_32A:
        return ConnectorType.IEC_60309_2_three_32;
      case ConnectorEnumType.sType3:
        return ConnectorType.IEC_62196_T3C;
      default:
        // TODO figure out a different default value as needed
        return ConnectorType.IEC_62196_T1_COMBO;
    }
  }

  private getConnectorPowerType(connectorType: string | undefined): PowerType {
    // TODO include more cases
    switch (connectorType) {
      case ConnectorEnumType.cType1:
        return PowerType.AC_1_PHASE;
      default:
        return PowerType.DC;
    }
  }
}
