import { IOcpiLocationMapper } from './IOcpiLocationMapper';
import { Location as OcpiLocation } from '../model/Location';
import { EvseDTO } from '../model/Evse';
import { Connector } from '../model/Connector';
import { GeoLocation } from '../model/GeoLocation';
import { sequelize as sequelizeCore } from '@citrineos/data';
import { EvseStatus } from '../model/EvseStatus';
import { AttributeEnumType, ConnectorEnumType, ConnectorStatusEnumType, } from '@citrineos/base';
import { Capability } from '../model/Capability';
import { ConnectorType } from '../model/ConnectorType';
import { ConnectorFormat } from '../model/ConnectorFormat';
import { PowerType } from '../model/PowerType';
import {
  AUTH_CONTROLLER_COMPONENT,
  CONNECTOR_COMPONENT,
  EVSE_COMPONENT,
  TOKEN_READER_COMPONENT,
  UNKNOWN_ID
} from "../util/consts";

export class CitrineOcpiLocationMapper implements IOcpiLocationMapper {
  // TODO pass credentials
  // TODO pass in evse charging attributes map??
  mapToOcpiLocation(
    citrineLocation: sequelizeCore.Location,
    chargingStationVariableAttributesMap: Record<string, sequelizeCore.VariableAttribute[]>,
  ): OcpiLocation {
    const ocpiLocation = new OcpiLocation();

    ocpiLocation.id = citrineLocation.id;

    // TODO update with credentials
    ocpiLocation.country_code = 'US'; // TODO update with credentials
    ocpiLocation.party_id = 'COS'; // TODO update with credentials

    // TODO update with dynamic data
    ocpiLocation.publish = true;
    // ocpiLocation.publish_allowed_to
    ocpiLocation.last_updated = new Date();

    // ADDRESS FIELDS
    // TODO update all address fields below with dynamic data from ocpp location
    ocpiLocation.name = 'Test Location';
    ocpiLocation.address = 'address';
    ocpiLocation.city = 'city';
    ocpiLocation.postal_code = '12345';
    ocpiLocation.state = 'New York';
    ocpiLocation.country = 'USA';

    ocpiLocation.coordinates = this.getCoordinates(citrineLocation.coordinates);

    const evses: EvseDTO[] = [];

    for (let chargingStation of citrineLocation.chargingPool) {
      const evseVariableAttributesMap = this.getEvseVariableAttributesMap(chargingStationVariableAttributesMap[chargingStation.id]);

      Object.values(evseVariableAttributesMap).forEach(evseVariableAttributes =>
        evses.push(this.mapToOcpiEvse(
          citrineLocation,
          evseVariableAttributes,
          null // TODO add evse ocpi information from new table
        ))
      )
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

  // TODO needs the charging station MAP
  // TODO needs the EVSE attributes map
  mapToOcpiEvse(
    citrineLocation: sequelizeCore.Location,
    evseVariableAttributes: sequelizeCore.VariableAttribute[],
    evseOcpiInformation: any // TODO make not any
  ): EvseDTO {
    const connectorVariableAttributesMap = this.getConnectorVariableAttributesMap(evseVariableAttributes);

    const availabilityState = this.getComponent(
      evseVariableAttributes,
      EVSE_COMPONENT,
      'AvailabilityState',
      AttributeEnumType.Actual,
    );

    const parkingBayOccupancy = this.getComponent(
      evseVariableAttributes,
      'BayOccupancySensor',
      'Active',
      AttributeEnumType.Actual,
    );

    const evse = new EvseDTO();
    evse.uid = evseOcpiInformation['uid'];
    evse.status = this.getStatus(availabilityState, parkingBayOccupancy);
    evse.connectors = Object.keys(connectorVariableAttributesMap).map((id) =>
      this.mapToOcpiConnector(Number(id), evseVariableAttributes, connectorVariableAttributesMap[id]),
    );
    evse.evse_id = this.getComponent(
      evseVariableAttributes,
      EVSE_COMPONENT,
      'EvseId',
      AttributeEnumType.Actual,
    )?.value;
    evse.capabilities = this.getCapabilities(evseVariableAttributes);
    evse.coordinates = this.getCoordinates(citrineLocation.coordinates);
    evse.physical_reference = evseOcpiInformation['physical_reference'];
    evse.last_updated = new Date(Math.max(availabilityState?.updatedAt ?? 0, parkingBayOccupancy?.updatedAt ?? 0));

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
    evseVariableAttributes: sequelizeCore.VariableAttribute[],
    connectorVariableAttributes: sequelizeCore.VariableAttribute[]
  ): Connector {
    const ocppConnectorType = this.getComponent(
      connectorVariableAttributes,
      CONNECTOR_COMPONENT,
      'ConnectorType',
      AttributeEnumType.Actual,
    );

    const availabilityState = this.getComponent(
      connectorVariableAttributes,
      CONNECTOR_COMPONENT,
      'AvailabilityState',
      AttributeEnumType.Actual
    );

    const connector = new Connector();
    connector.id = String(id);
    connector.last_updated = availabilityState?.updatedAt ?? availabilityState?.createdAt;
    connector.standard = this.getConnectorStandard(ocppConnectorType?.value);
    connector.format = ConnectorFormat.CABLE; // TODO dynamically determine if CABLE Or SOCKET
    connector.power_type = this.getConnectorPowerType(ocppConnectorType?.value);
    connector.max_voltage = Number(
      this.getComponent(
        evseVariableAttributes,
        EVSE_COMPONENT,
        'DCVoltage',
        AttributeEnumType.MaxSet,
      )?.value ?? '0',
    );
    connector.max_amperage = Number(
      this.getComponent(
        evseVariableAttributes,
        EVSE_COMPONENT,
        'DCCurrent',
        AttributeEnumType.MaxSet,
      )?.value ?? '0',
    );
    connector.max_electric_power = Number(
      this.getComponent(
        evseVariableAttributes,
        EVSE_COMPONENT,
        'Power',
        AttributeEnumType.MaxSet,
      )?.value ?? '0',
    );

    // TODO make dynamic mappings for the remaining optional fields
    // connector.tariff_ids
    // connector.terms_and_conditions

    return connector;
  }

  getEvseVariableAttributesMap(chargingStationVariableAttributes: sequelizeCore.VariableAttribute[]) {
    return chargingStationVariableAttributes
      .filter(va => va.component.name === EVSE_COMPONENT || va.component.name === CONNECTOR_COMPONENT)
      .reduce(
        (acc: Record<string, sequelizeCore.VariableAttribute[]>, va) => {
          acc[(va.evse?.id ?? UNKNOWN_ID)] = [...(acc[(va.evse?.id ?? UNKNOWN_ID)] ?? []), va];
          return acc;
        },
        {},
      );
  }

  getConnectorVariableAttributesMap(evseVariableAttributes: sequelizeCore.VariableAttribute[]) {
    return evseVariableAttributes.reduce(
      (acc: Record<string, sequelizeCore.VariableAttribute[]>, va) => {
        acc[(va.evse?.connectorId ?? UNKNOWN_ID)] = [...(acc[(va.evse?.connectorId ?? UNKNOWN_ID)] ?? []), va];
        return acc;
      },
      {},
    );
  }

  // Helpers

  private getCoordinates(ocppCoordinates: [number, number]): GeoLocation {
    const geoLocation = new GeoLocation();
    geoLocation.latitude = String(ocppCoordinates[0]);
    geoLocation.longitude = String(ocppCoordinates[1]);
    return geoLocation;
  }

  private getCapabilities(variableAttributes: sequelizeCore.VariableAttribute[]): Capability[] {
    // TODO add remaining capabilities
    const capabilities: Capability[] = [];

    const authorizeRemoteStart = this.getComponent(
      variableAttributes,
      AUTH_CONTROLLER_COMPONENT,
      'AuthorizeRemoteStart',
      AttributeEnumType.Actual
    )?.value;

    const tokenReaderEnabled = this.getComponent(
      variableAttributes,
      TOKEN_READER_COMPONENT,
      'Enabled',
      AttributeEnumType.Actual
    )?.value;

    if (authorizeRemoteStart === 'true') {
      capabilities.push(Capability.REMOTE_START_STOP_CAPABLE);
    }
    if (tokenReaderEnabled === 'true') {
      capabilities.push(Capability.RFID_READER);
    }

    return capabilities;
  }

  private getComponent(
    variableAttributes: sequelizeCore.VariableAttribute[],
    component: string,
    variable: string,
    attribute: AttributeEnumType,
  ): sequelizeCore.VariableAttribute | undefined {
    const matchingVariableAttribute = variableAttributes.filter(
      (va) =>
        va.component.name === component &&
        va.variable.name === variable &&
        va.type === attribute,
    );

    return matchingVariableAttribute.length > 0
      ? matchingVariableAttribute[0]
      : undefined;
  }

  private getStatus(availabilityState?: sequelizeCore.VariableAttribute, parkingBayOccupancy?: sequelizeCore.VariableAttribute): EvseStatus {
    if (parkingBayOccupancy?.value === 'true') {
      return EvseStatus.BLOCKED;
    }

    // TODO add case for REMOVED
    switch (availabilityState?.value) {
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
