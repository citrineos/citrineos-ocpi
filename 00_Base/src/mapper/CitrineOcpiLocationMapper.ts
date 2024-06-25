import { IOcpiLocationMapper } from './IOcpiLocationMapper';
import { OcpiLocation } from '../model/Location';
import { LocationDTO } from '../model/DTO/LocationDTO';
import { EvseDTO, UID_FORMAT } from '../model/DTO/EvseDTO';
import { ConnectorDTO } from '../model/DTO/ConnectorDTO';
import { GeoLocation } from '../model/GeoLocation';
import { Location } from '@citrineos/data';
import { EvseStatus } from '../model/EvseStatus';
import { ConnectorEnumType, ConnectorStatusEnumType, } from '@citrineos/base';
import { Capability } from '../model/Capability';
import { ConnectorType } from '../model/ConnectorType';
import { ConnectorFormat } from '../model/ConnectorFormat';
import { PowerType } from '../model/PowerType';
import { ChargingStationVariableAttributes } from "../model/variable-attributes/ChargingStationVariableAttributes";
import { EvseVariableAttributes } from "../model/variable-attributes/EvseVariableAttributes";
import { OcpiEvse } from "../model/Evse";
import { ConnectorVariableAttributes } from "../model/variable-attributes/ConnectorVariableAttributes";
import { OcpiConnector } from "../model/Connector";
import { Service } from "typedi";
import { NOT_APPLICABLE } from "../util/consts";

@Service()
export class CitrineOcpiLocationMapper implements IOcpiLocationMapper {
  // TODO pass credentials
  mapToOcpiLocation(
    citrineLocation: Location,
    chargingStationVariableAttributesMap: Record<string, ChargingStationVariableAttributes>,
    ocpiLocationInfo?: OcpiLocation
  ): LocationDTO {
    const ocpiLocation = new LocationDTO();

    ocpiLocation.id = citrineLocation.id;

    // TODO update with credentials
    ocpiLocation.country_code = 'US'; // TODO update with credentials
    ocpiLocation.party_id = 'COS'; // TODO update with credentials

    // TODO update with dynamic data
    ocpiLocation.last_updated = ocpiLocationInfo?.lastUpdated ?? new Date(); // TODO better fallback
    ocpiLocation.publish = ocpiLocationInfo?.publish ?? true;
    // ocpiLocation.publish_allowed_to

    ocpiLocation.name = citrineLocation.name ?? NOT_APPLICABLE;
    ocpiLocation.address = citrineLocation.address ?? NOT_APPLICABLE;
    ocpiLocation.city = citrineLocation.city ?? NOT_APPLICABLE;
    ocpiLocation.postal_code = citrineLocation.postalCode ?? NOT_APPLICABLE;
    ocpiLocation.state = citrineLocation.state ?? NOT_APPLICABLE;
    ocpiLocation.country = citrineLocation.country ?? NOT_APPLICABLE;
    ocpiLocation.coordinates = this.getCoordinates(citrineLocation.coordinates);

    const evses: EvseDTO[] = [];

    for (let chargingStationAttributes of Object.values(chargingStationVariableAttributesMap)) {
      for (let evseAttributes of Object.values(chargingStationAttributes.evses)) {
        evses.push(
          this.mapToOcpiEvse(
            citrineLocation,
            chargingStationAttributes,
            evseAttributes
          )
        );
      }
    }

    ocpiLocation.evses = [...evses];

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

    return ocpiLocation;
  }

  mapToOcpiEvse(
    citrineLocation: Location,
    chargingStationAttributes: ChargingStationVariableAttributes,
    evseAttributes: EvseVariableAttributes,
    ocpiEvseInformation?: OcpiEvse
  ): EvseDTO {
    const evse = new EvseDTO();
    evse.uid = UID_FORMAT(chargingStationAttributes.id, evseAttributes.id); // format evse uid
    evse.status = this.getStatus(evseAttributes.evseAvailabilityState, chargingStationAttributes.bayOccupancySensorActive);
    evse.evse_id = evseAttributes.evseId;
    evse.capabilities = this.getCapabilities(chargingStationAttributes.authorizeRemoteStart, chargingStationAttributes.tokenReaderEnabled);
    evse.coordinates = this.getCoordinates(citrineLocation.coordinates);
    evse.physical_reference = ocpiEvseInformation?.physicalReference;
    evse.last_updated = ocpiEvseInformation?.lastUpdated ?? new Date() // TODO better fallback

    const connectors = [];

    for (let [connectorId, connectorAttributes] of Object.entries(evseAttributes.connectors)) {
      connectors.push(this.mapToOcpiConnector(Number(connectorId), evseAttributes, connectorAttributes));
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
    ocpiConnectorInfo?: OcpiConnector
  ): ConnectorDTO {
    const ocppConnectorType = connectorAttributes.connectorType;

    const connector = new ConnectorDTO();
    connector.id = String(id);
    connector.last_updated = ocpiConnectorInfo?.lastUpdated ?? new Date(); // TODO better fallback
    connector.standard = this.getConnectorStandard(ocppConnectorType);
    connector.format = ConnectorFormat.CABLE; // TODO dynamically determine if CABLE Or SOCKET
    connector.power_type = this.getConnectorPowerType(ocppConnectorType);
    connector.max_voltage = Number(evseAttributes.evseDcVoltage);
    connector.max_amperage = Number(evseAttributes.evseDcCurrent);
    connector.max_electric_power = Number(evseAttributes.evsePower);

    // TODO make dynamic mappings for the remaining optional fields
    // connector.tariff_ids
    // connector.terms_and_conditions

    return connector;
  }

  /*
    Helpers
  */

  private getCoordinates(ocppCoordinates: [number, number]): GeoLocation {
    const geoLocation = new GeoLocation();
    geoLocation.latitude = String(ocppCoordinates[0]);
    geoLocation.longitude = String(ocppCoordinates[1]);
    return geoLocation;
  }

  private getCapabilities(authorizeRemoteStart: string, tokenReaderEnabled: string): Capability[] {
    // TODO add remaining capabilities
    const capabilities: Capability[] = [];

    if (authorizeRemoteStart === 'true') {
      capabilities.push(Capability.REMOTE_START_STOP_CAPABLE);
    }
    if (tokenReaderEnabled === 'true') {
      capabilities.push(Capability.RFID_READER);
    }

    return capabilities;
  }

  private getStatus(
    availabilityState: string,
    parkingBayOccupancy: string
  ): EvseStatus {
    if (parkingBayOccupancy === 'true') {
      return EvseStatus.BLOCKED;
    }

    // TODO add case for REMOVED
    switch (availabilityState) {
      case ConnectorStatusEnumType.Occupied:
        return EvseStatus.CHARGING;
      case ConnectorStatusEnumType.Available:
        return EvseStatus.AVAILABLE;
      case ConnectorStatusEnumType.Unavailable:
        return EvseStatus.INOPERATIVE;
      case ConnectorStatusEnumType.Faulted:
        return EvseStatus.OUTOFORDER;
      case ConnectorStatusEnumType.Reserved:
        return EvseStatus.RESERVED;
      default:
        return EvseStatus.UNKNOWN;
    }
  }

  private getConnectorStandard(connectorType: string | undefined): ConnectorType {
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
