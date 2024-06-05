
import { IOcpiLocationMapper } from './IOcpiLocationMapper';
import { Location as OcpiLocation } from '../../model/Location';
import { Evse } from '../../model/Evse';
import { Connector } from '../../model/Connector';
import { GeoLocation } from '../../model/GeoLocation';
import { Location as OcppLocation, ChargingStation } from '@citrineos/data/src/layers/sequelize';
import { VariableAttributeType } from '@citrineos/base';

// we need some more locations...
// as in charging stations at the same location
export class CitrineOcpiLocationMapper implements IOcpiLocationMapper {
  // TODO figure out credentials
  mapToOcpiLocation(
    ocppLocation: OcppLocation,
    variableAttributes: VariableAttributeType
  ): OcpiLocation {
    const ocpiLocation = new OcpiLocation();

    ocpiLocation.id = ocppLocation.id;

    // TODO update with credentials
    ocpiLocation.country_code = 'US'; // TODO update with credentials
    ocpiLocation.party_id = 'COS'; // TODO update with credentials

    // TODO update with dynamic data
    ocpiLocation.publish = true; 
    // ocpiLocation.publish_allowed_to

    // ADDRESS FIELDS
    // TODO update all address fields below with dynamic data from ocpp location
    ocpiLocation.name = 'Test Location';
    ocpiLocation.address = 'address';
    ocpiLocation.city = 'city'; 
    ocpiLocation.postal_code = '12345';
    ocpiLocation.state = 'New York';
    ocpiLocation.country = 'USA';
  
    ocpiLocation.coordinates = this.getCoordinates(ocppLocation.coordinates);
    ocpiLocation.evses = [];

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

  mapToOcpiEvse(): Evse {

  }

  mapToOcpiConnector(): Connector {

  }

  getCoordinates(ocppCoordinates: [number, number]): GeoLocation {
    const geoLocation = new GeoLocation();
    geoLocation.latitude = String(ocppCoordinates[0]);
    geoLocation.longitude = String(ocppCoordinates[1]);
    return geoLocation;
  }
}