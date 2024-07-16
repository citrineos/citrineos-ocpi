import { Service } from 'typedi';
import { type ILogObj, Logger } from 'tslog';
import { ChargingStation, Location, SequelizeLocationRepository } from '@citrineos/data';
import {
  AdminConnectorDTO,
  AdminEVSEDTO,
  AdminLocationDTO,
  CitrineOcpiLocationMapper, LocationDTO,
  LocationsBroadcaster,
  OcpiLocation,
  OcpiLocationProps,
  OcpiLocationRepository,
  OcpiEvse,
  OcpiEvseRepository,
  OcpiConnector,
  OcpiConnectorRepository,
  UID_FORMAT,
  TEMPORARY_CONNECTOR_ID,
  VariableAttributesUtil,
} from '@citrineos/ocpi-base';

@Service()
export class AdminLocationsService {
  constructor(
    private logger: Logger<ILogObj>,
    private locationRepository: SequelizeLocationRepository,
    private ocpiLocationRepository: OcpiLocationRepository,
    private ocpiEvseRepository: OcpiEvseRepository,
    private ocpiConnectorRepository: OcpiConnectorRepository,
    private locationsBroadcaster: LocationsBroadcaster,
    private variableAttributesUtil: VariableAttributesUtil
  ) { }

  public async createOrUpdateLocation(
    adminLocationDto: AdminLocationDTO,
    broadcast: boolean
  ): Promise<LocationDTO> {
    this.logger.debug(`Creating Location ${adminLocationDto.name}`);

    const [ocpiLocation, citrineLocation] = this.mapAdminLocationDtoToEntities(adminLocationDto);
    const savedCitrineLocation = await this.locationRepository.createOrUpdateLocation(citrineLocation);
    const citrineLocationId = savedCitrineLocation.id;
    ocpiLocation[OcpiLocationProps.citrineLocationId] = citrineLocationId;
    const savedOcpiLocation = await this.ocpiLocationRepository.createOrUpdateOcpiLocation(ocpiLocation);

    const stationIds = adminLocationDto.evses ? [...new Set(adminLocationDto.evses.map(evse => evse.station_id))] : [];
    const chargingPool = [];
    for (let stationId of stationIds) {
      const inputChargingStation = ChargingStation.build({ id: stationId, locationId: citrineLocationId });
      const savedChargingStation = await this.locationRepository.createOrUpdateChargingStation(inputChargingStation);
      chargingPool.push(savedChargingStation);
    }

    if (chargingPool.length > 0) {
      savedCitrineLocation.chargingPool = [chargingPool[0], ...chargingPool.slice(1, chargingPool.length)];
    }

    const ocpiEvses: Record<string, OcpiEvse> = {};
    for (let adminEvse of adminLocationDto.evses ?? []) {
      const ocpiConnectors: Record<string, OcpiConnector> = {};
      const ocpiEvse = await this.ocpiEvseRepository.createOrUpdateOcpiEvse(this.mapAdminEvseDtoToOcpiEvse(adminEvse));

      for (let adminConnector of adminEvse.connectors ?? []) {
        ocpiConnectors[`${TEMPORARY_CONNECTOR_ID(adminEvse.station_id, adminEvse.id, adminConnector.id)}`] = await this.ocpiConnectorRepository.createOrUpdateOcpiConnector(this.mapAdminConnectorToOcpiConnector(adminConnector, adminEvse));
      }

      ocpiEvse.ocpiConnectors = { ...ocpiConnectors };

      ocpiEvses[`${UID_FORMAT(adminEvse.station_id, adminEvse.id)}`] = ocpiEvse;
    }

    // TODO uncomment when bugfix is merged in
    savedOcpiLocation.ocpiEvses = {...ocpiEvses};

    const chargingStationVariableAttributes = await this.variableAttributesUtil.createChargingStationVariableAttributesMap(stationIds)
    const locationDto = CitrineOcpiLocationMapper.mapToOcpiLocation(savedCitrineLocation, chargingStationVariableAttributes, savedOcpiLocation);

    if (adminLocationDto.push_to_msps && broadcast) {
      await this.locationsBroadcaster.broadcastOnLocationCreateOrUpdate(locationDto);
    }

    return locationDto;
  }

  mapAdminLocationDtoToEntities(
    adminLocationDto: AdminLocationDTO
  ): [Partial<OcpiLocation>, Partial<Location>] {
    const ocpiLocation: Partial<OcpiLocation> = { };
    ocpiLocation[OcpiLocationProps.countryCode] = adminLocationDto.country_code;
    ocpiLocation[OcpiLocationProps.partyId] = adminLocationDto.party_id;
    ocpiLocation[OcpiLocationProps.publish] = adminLocationDto.publish;
    ocpiLocation[OcpiLocationProps.lastUpdated] = new Date();
    ocpiLocation[OcpiLocationProps.timeZone] = adminLocationDto.time_zone;

    const citrineLocation: Partial<Location> = { };
    citrineLocation.id = adminLocationDto.id;
    citrineLocation.name = adminLocationDto.name;
    citrineLocation.address = adminLocationDto.address;
    citrineLocation.city = adminLocationDto.city;
    citrineLocation.postalCode = adminLocationDto.postal_code;
    citrineLocation.state = adminLocationDto.state;
    citrineLocation.country = adminLocationDto.country;

    if (adminLocationDto.coordinates) {
      citrineLocation.coordinates = { type: "Point", coordinates: [Number(adminLocationDto.coordinates.longitude), Number(adminLocationDto.coordinates.latitude)] };
    }

    return [ocpiLocation, citrineLocation];
  }

  mapAdminEvseDtoToOcpiEvse(
    adminEvseDto: AdminEVSEDTO
  ): OcpiEvse {
    const ocpiEvse = new OcpiEvse();
    ocpiEvse.evseId = adminEvseDto.id;
    ocpiEvse.stationId = adminEvseDto.station_id;
    ocpiEvse.physicalReference = adminEvseDto.physical_reference;
    ocpiEvse.removed = adminEvseDto.removed;
    ocpiEvse.lastUpdated = new Date();
    return ocpiEvse;
  }

  mapAdminConnectorToOcpiConnector(
    adminConnectorDto: AdminConnectorDTO,
    adminEvseDto: AdminEVSEDTO
  ): OcpiConnector {
    const ocpiConnector = new OcpiConnector();
    ocpiConnector.connectorId = adminConnectorDto.id;
    ocpiConnector.evseId = adminEvseDto.id;
    ocpiConnector.stationId = adminEvseDto.station_id;
    ocpiConnector.lastUpdated = new Date();
    return ocpiConnector;
  }
}