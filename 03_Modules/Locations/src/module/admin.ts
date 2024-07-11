import { Service } from 'typedi';
import { type ILogObj, Logger } from 'tslog';
import { SequelizeLocationRepository } from '@citrineos/data';
import { OcpiLocationRepository } from '@citrineos/ocpi-base/dist/repository/OcpiLocationRepository';
import { CitrineOcpiLocationMapper, LocationDTO, LocationsBroadcaster, OcpiLocationProps } from '@citrineos/ocpi-base';

@Service()
export class AdminLocationsService {
  constructor(
    private logger: Logger<ILogObj>,
    private locationRepository: SequelizeLocationRepository,
    private ocpiLocationRepository: OcpiLocationRepository,
    private locationMapper: CitrineOcpiLocationMapper,
    private locationsBroadcaster: LocationsBroadcaster
  ) {

  }

  public async createLocation(
    locationDto: LocationDTO,
    push: boolean
  ): Promise<void> {
    this.logger.debug(`Creating Location ${locationDto.name}`);

    const [ocpiLocation, citrineLocation] = this.locationMapper.mapLocationDtoToEntities(locationDto);
    const createdCitrineLocation = await this.locationRepository.create(citrineLocation);
    ocpiLocation[OcpiLocationProps.citrineLocationId] = createdCitrineLocation.id;
    await this.ocpiLocationRepository.create(ocpiLocation);

    if (push) {
      locationDto.id = createdCitrineLocation.id;
      await this.locationsBroadcaster.broadcastOnLocationCreate(locationDto);
    }
  }
}