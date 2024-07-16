import { Service } from 'typedi';
import { type ILogObj, Logger } from 'tslog';
import { ChargingStation, Location, SequelizeLocationRepository } from '@citrineos/data';
import { OcpiLocationRepository } from '@citrineos/ocpi-base/dist/repository/OcpiLocationRepository';
import {
  AdminConnectorDTO,
  AdminEVSEDTO,
  AdminLocationDTO,
  CitrineOcpiLocationMapper, LocationDTO,
  LocationsBroadcaster, NOT_APPLICABLE, OcpiLocation, OcpiLocationProps, VariableAttributesUtil,
} from '@citrineos/ocpi-base';
import { OcpiEvse } from '@citrineos/ocpi-base/dist/model/OcpiEvse';
import { OcpiEvseRepository } from '@citrineos/ocpi-base/dist/repository/OcpiEvseRepository';
import { OcpiConnectorRepository } from '@citrineos/ocpi-base/dist/repository/OcpiConnectorRepository';
import { OcpiConnector } from '@citrineos/ocpi-base/dist/model/OcpiConnector';

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
  ) {

  }

  public async createOrUpdateLocation(
    adminLocationDto: AdminLocationDTO,
    broadcast: boolean
  ): Promise<void> {
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

    const ocpiEvses = [];
    for (let adminEvse of adminLocationDto.evses ?? []) {
      const ocpiConnectors = [];
      const ocpiEvse = await this.ocpiEvseRepository.createOrUpdateOcpiEvse(this.mapAdminEvseDtoToOcpiEvse(adminEvse));

      for (let adminConnector of adminEvse.connectors ?? []) {
        const ocpiConnector = await this.ocpiConnectorRepository.createOrUpdateOcpiConnector(this.mapAdminConnectorToOcpiConnector(adminConnector, adminEvse));
        ocpiConnectors.push(ocpiConnector);
      }

      // TODO uncomment when bugfix is merged in
      // ocpiEvse.ocpiConnectors = [...ocpiConnectors];

      ocpiEvses.push(ocpiEvse);
    }

    // TODO uncomment when bugfix is merged in
    // savedOcpiLocation.ocpiEvses = [...ocpiEvses];

    if (adminLocationDto.push_to_msps && broadcast) {
      const chargingStationVariableAttributes = await this.variableAttributesUtil.createChargingStationVariableAttributesMap(stationIds)
      const locationDto = CitrineOcpiLocationMapper.mapToOcpiLocation(savedCitrineLocation, chargingStationVariableAttributes, savedOcpiLocation);
      await this.locationsBroadcaster.broadcastOnLocationCreateOrUpdate(locationDto);
    }
  }

  mapAdminLocationDtoToEntities(
    adminLocationDto: AdminLocationDTO
  ): [OcpiLocation, Location] {
    const ocpiLocation = new OcpiLocation();
    ocpiLocation[OcpiLocationProps.countryCode] = adminLocationDto.country_code;
    ocpiLocation[OcpiLocationProps.partyId] = adminLocationDto.party_id;
    ocpiLocation[OcpiLocationProps.publish] = adminLocationDto.publish;
    ocpiLocation[OcpiLocationProps.lastUpdated] = new Date();

    const citrineLocation = new Location();
    citrineLocation.id = adminLocationDto.citrine_location_id;
    citrineLocation.name = adminLocationDto.name ?? NOT_APPLICABLE;
    citrineLocation.address = adminLocationDto.address ?? NOT_APPLICABLE;
    citrineLocation.city = adminLocationDto.city ?? NOT_APPLICABLE;
    citrineLocation.postalCode = adminLocationDto.postal_code ?? NOT_APPLICABLE;
    citrineLocation.state = adminLocationDto.state ?? NOT_APPLICABLE;
    citrineLocation.country = adminLocationDto.country ?? NOT_APPLICABLE;
    citrineLocation.coordinates = adminLocationDto.coordinates ? [Number(adminLocationDto.coordinates.latitude), Number(adminLocationDto.coordinates.longitude)] : [0, 0];

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