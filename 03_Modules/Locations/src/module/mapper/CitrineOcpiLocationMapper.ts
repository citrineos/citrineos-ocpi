import { IOcpiLocationMapper } from './IOcpiLocationMapper';
import { Location as OcpiLocation } from '../../../../../Server/src/model/Location';
import { Evse } from '../../../../../Server/src/model/Evse';
import { Connector } from '../../../../../Server/src/model/Connector';
import { GeoLocation } from '../../../../../Server/src/model/GeoLocation';
import {
  Location as OcppLocation,
  ChargingStation,
  VariableAttribute,
} from '@citrineos/data/src/layers/sequelize';
import { EvseStatus } from '../../../../../Server/src/model/EvseStatus';
import {
  AttributeEnumType,
  ConnectorEnumType,
  ConnectorStatusEnumType,
} from '@citrineos/base';
import { Capability } from '../../../../../Server/src/model/Capability';
import { ConnectorType } from '../../../../../Server/src/model/ConnectorType';
import { ConnectorFormat } from '../../../../../Server/src/model/ConnectorFormat';
import { PowerType } from '../../../../../Server/src/model/PowerType';

// we need some more locations...
// as in charging stations at the same location
export class CitrineOcpiLocationMapper implements IOcpiLocationMapper {
  // TODO figure out credentials
  mapToOcpiLocation(
    ocppLocation: OcppLocation,
    evseVariableAttributesMap: Record<string, VariableAttribute[]>,
  ): OcpiLocation {
    const ocpiLocation = new OcpiLocation();

    ocpiLocation.id = ocppLocation.id;

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

    ocpiLocation.coordinates = this.getCoordinates(ocppLocation.coordinates);
    ocpiLocation.evses = ocppLocation.chargingPool.map((chargingStation) =>
      this.mapToOcpiEvse(
        ocppLocation,
        chargingStation,
        evseVariableAttributesMap[chargingStation.id],
      ),
    ); // TODO confirm that charging station would be related to evse id

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
    location: OcppLocation,
    chargingStation: ChargingStation,
    variableAttributes: VariableAttribute[],
  ): Evse {
    const connectorVariableAttributesMap = variableAttributes.reduce(
      (acc: Record<string, VariableAttribute[]>, va) => {
        if (va.evse?.connectorId) {
          acc[va.evse.connectorId] = [...(acc[va.evse.connectorId] ?? []), va];
        }

        return acc;
      },
      {},
    );

    const evse = new Evse();
    evse.uid = chargingStation.id;
    evse.status = this.getStatus(variableAttributes);
    evse.connectors = Object.keys(connectorVariableAttributesMap).map((id) =>
      this.mapToOcpiConnector(Number(id), connectorVariableAttributesMap[id]),
    );
    evse.last_updated = new Date(); // make dynamic, must not be empty
    evse.evse_id = this.getComponent(
      variableAttributes,
      'EVSE',
      'EvseId',
      AttributeEnumType.Actual,
    );
    evse.capabilities = this.getCapabilities(variableAttributes);
    evse.coordinates = this.getCoordinates(location.coordinates);
    evse.physical_reference = chargingStation.id; // TODO confirm this is the value

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
    variableAttributes: VariableAttribute[],
  ): Connector {
    const ocppConnectorType = this.getComponent(
      variableAttributes,
      'Connector',
      'ConnectorType',
      AttributeEnumType.Actual,
    );

    const connector = new Connector();
    connector.id = String(id);
    connector.standard = this.getConnectorStandard(ocppConnectorType);
    connector.format = ConnectorFormat.CABLE; // TODO dynamically determine if CABLE Or SOCKET
    connector.power_type = this.getConnectorPowerType(ocppConnectorType);
    connector.max_voltage = Number(
      this.getComponent(
        variableAttributes,
        'EVSE',
        'DCVoltage',
        AttributeEnumType.MaxSet,
      ) ?? '0',
    );
    connector.max_amperage = Number(
      this.getComponent(
        variableAttributes,
        'EVSE',
        'DCCurrent',
        AttributeEnumType.MaxSet,
      ) ?? '0',
    );
    connector.max_electric_power = Number(
      this.getComponent(
        variableAttributes,
        'EVSE',
        'Power',
        AttributeEnumType.MaxSet,
      ) ?? '0',
    );

    // TODO make dynamic mappings for the remaining optional fields
    // connector.tariff_ids
    // connector.terms_and_conditions

    return connector;
  }

  // Helpers

  getCoordinates(ocppCoordinates: [number, number]): GeoLocation {
    const geoLocation = new GeoLocation();
    geoLocation.latitude = String(ocppCoordinates[0]);
    geoLocation.longitude = String(ocppCoordinates[1]);
    return geoLocation;
  }

  // TODO add logic
  getCapabilities(variableAttributes: VariableAttribute[]): Capability[] {
    return [];
  }

  getComponent(
    variableAttributes: VariableAttribute[],
    component: string,
    variable: string,
    attribute: AttributeEnumType,
  ): string | undefined {
    const matchingVariableAttribute = variableAttributes.filter(
      (va) =>
        va.component.name === component &&
        va.variable.name === variable &&
        va.type === attribute,
    );

    return matchingVariableAttribute.length > 0
      ? matchingVariableAttribute[0].value
      : undefined;
  }

  getStatus(variableAttributes: VariableAttribute[]): EvseStatus {
    const parkingBayOccupancy = this.getComponent(
      variableAttributes,
      'BayOccupancySensor',
      'Active',
      AttributeEnumType.Actual,
    );

    if (parkingBayOccupancy === 'true') {
      return EvseStatus.BLOCKED;
    }

    const availabilityState = this.getComponent(
      variableAttributes,
      'EVSE',
      'AvailabilityState',
      AttributeEnumType.Actual,
    );

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

  getConnectorStandard(connectorType: string | undefined): ConnectorType {
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

  getConnectorPowerType(connectorType: string | undefined): PowerType {
    // TODO include more cases
    switch (connectorType) {
      case ConnectorEnumType.cType1:
        return PowerType.AC_1_PHASE;
      default:
        return PowerType.DC;
    }
  }
}
