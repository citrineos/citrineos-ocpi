
import { IOcpiLocationMapper } from './IOcpiLocationMapper';
import { Location as OcpiLocation } from '../../model/Location';
import { Evse } from '../../model/Evse';
import { Connector } from '../../model/Connector';
import { GeoLocation } from '../../model/GeoLocation';
import { Location as OcppLocation, ChargingStation, VariableAttribute } from '@citrineos/data/src/layers/sequelize';
import { EvseStatus } from '../../model/EvseStatus';
import { AttributeEnumType } from '@citrineos/base';
import { Capability } from '../../model/Capability';

// we need some more locations...
// as in charging stations at the same location
export class CitrineOcpiLocationMapper implements IOcpiLocationMapper {
  // TODO figure out credentials
  mapToOcpiLocation(
    ocppLocation: OcppLocation,
    variableAttributes: VariableAttribute[]
  ): OcpiLocation {
    const evseVariableAtributesMap = variableAttributes.reduce((acc, va) => {
      if (va.evse) {
        acc[va.evse.id] = [...(acc[va.evse.id] ?? []), va];
      }

      return acc;
    }, {});

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
    ocpiLocation.evses = ocppLocation.chargingPool
      .map(chargingStation => this.mapToOcpiEvse(ocppLocation, chargingStation, evseVariableAtributesMap[chargingStation.id])); // TODO confirm that charging station would be related to evse id

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

  mapToOcpiEvse(location: OcppLocation, chargingStation: ChargingStation, variableAttributes: VariableAttribute[]): Evse {
    const connectorVariableAttributesMap = variableAttributes.reduce((acc, va) => {
      if (va.evse?.connectorId) {
        acc[va.evse.connectorId] = [...(acc[va.evse.connectorId] ?? []), va];
      }

      return acc;
    }, {});

    const evse = new Evse();
    evse.uid = chargingStation.id;
    evse.status = EvseStatus.AVAILABLE; // make dynamic, can get from variable attributes?
    evse.connectors = Object.keys(connectorVariableAttributesMap).map(id => this.mapToOcpiConnector(Number(id), connectorVariableAttributesMap[id]));
    evse.last_updated = new Date(); // make dynamic, must not be empty
    evse.evse_id = this.getComponent(variableAttributes, 'EVSE', 'EvseId', AttributeEnumType.Actual);
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

  mapToOcpiConnector(id: number, variableAttributes: VariableAttribute[]): Connector {
    const connector = new Connector();
    connector.id = String(id);
    connector.standard = null; // TODO create helper to fill this in
    connector.format = null; // TODO create helper to fill this in
    connector.power_type = null // TODO create helper to fill this in;
    connector.max_voltage = Number(this.getComponent(variableAttributes, 'EVSE', 'DCVoltage', AttributeEnumType.MaxSet) ?? '0');
    connector.max_amperage = Number(this.getComponent(variableAttributes, 'EVSE', 'DCCurrent', AttributeEnumType.MaxSet) ?? '0');
    connector.max_electric_power = Number(this.getComponent(variableAttributes, 'EVSE', 'Power', AttributeEnumType.MaxSet) ?? '0');

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

  getComponent(variableAttributes: VariableAttribute[], component: string, variable: string, attribute: AttributeEnumType): string {
    const matchingVariableAttribute = variableAttributes
      .filter(va => va.component.name === component && va.variable.name === variable && va.type === attribute);

    return matchingVariableAttribute.length > 0 ? matchingVariableAttribute[0].value : null;
  }
  
}