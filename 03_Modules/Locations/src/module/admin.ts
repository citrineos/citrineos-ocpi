import { Service } from 'typedi';
import { type ILogObj, Logger } from 'tslog';
import { Location, SequelizeLocationRepository } from '@citrineos/data';
import { OcpiLocationRepository } from '@citrineos/ocpi-base/dist/repository/OcpiLocationRepository';
import {
  AdminLocationDTO,
  CitrineOcpiLocationMapper, LocationDTO,
  LocationsBroadcaster, NOT_APPLICABLE, OcpiLocation, OcpiLocationProps, VariableAttributesUtil,
} from '@citrineos/ocpi-base';
import { OcpiEvse } from '@citrineos/ocpi-base/dist/model/OcpiEvse';

@Service()
export class AdminLocationsService {
  constructor(
    private logger: Logger<ILogObj>,
    private locationRepository: SequelizeLocationRepository,
    private ocpiLocationRepository: OcpiLocationRepository,
    private locationsBroadcaster: LocationsBroadcaster,
    private variableAttributesUtil: VariableAttributesUtil
  ) {

  }

  public async createLocation(
    adminLocationDto: AdminLocationDTO,
    broadcast: boolean
  ): Promise<void> {
    this.logger.debug(`Creating Location ${adminLocationDto.name}`);

    const [ocpiLocation, citrineLocation] = this.mapAdminLocationDtoToEntities(adminLocationDto);
    const savedCitrineLocation = await this.createOrUpdateLocation(citrineLocation);

    const citrineLocationId = savedCitrineLocation.id;

    const stationIds = adminLocationDto.evses ? [...new Set(adminLocationDto.evses.map(evse => evse.station_id))] : [];
    const chargingStations = await this.locationRepository.getChargingStationsByIds(stationIds);
    chargingStations.forEach(chargingStation => chargingStation.update({ locationId: citrineLocationId }));

    ocpiLocation[OcpiLocationProps.citrineLocationId] = citrineLocationId;
    await this.ocpiLocationRepository.create(ocpiLocation);

    if (adminLocationDto.push_to_msps && broadcast) {
      const chargingStationVariableAttributes = await this.variableAttributesUtil.createChargingStationVariableAttributesMap(stationIds)

      const locationDto = CitrineOcpiLocationMapper.mapToOcpiLocation(citrineLocation, chargingStationVariableAttributes, ocpiLocation);
      await this.locationsBroadcaster.broadcastOnLocationCreate(locationDto);
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
    citrineLocation.address = adminLocationDto.address;
    citrineLocation.city = adminLocationDto.city;
    citrineLocation.postalCode = adminLocationDto.postal_code ?? NOT_APPLICABLE;
    citrineLocation.state = adminLocationDto.state ?? NOT_APPLICABLE;
    citrineLocation.country = adminLocationDto.country ?? NOT_APPLICABLE;
    citrineLocation.coordinates = [Number(adminLocationDto.coordinates.latitude), Number(adminLocationDto.coordinates.longitude)];

    return [ocpiLocation, citrineLocation];
  }

  async createOrUpdateLocation(location: Location): Promise<Location> {
    const [savedLocation, locationCreated] = await this.locationRepository.readOrCreateByQuery({
      where: {
        id: location.id
      },
      defaults: {
        name: location.name,
        address: location.address,
        city: location.city,
        postalCode: location.postalCode,
        state: location.state,
        country: location.country,
        coordinates: location.coordinates,
      },
    });
    if (!locationCreated) {
      await this.locationRepository.updateByKey(
        {
          name: location.name,
          address: location.address,
          city: location.city,
          postalCode: location.postalCode,
          state: location.state,
          country: location.country,
          coordinates: location.coordinates,
        },
        savedLocation.id,
      );
    }

    return savedLocation;
  }
}