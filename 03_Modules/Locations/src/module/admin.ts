import { Service } from 'typedi';
import { type ILogObj, Logger } from 'tslog';
import {
  ChargingStation,
  Location,
  SequelizeLocationRepository,
} from '@citrineos/data';
import {
  AdminConnectorDTO,
  AdminEvseDTO,
  AdminLocationDTO,
  LocationMapper,
  LocationDTO,
  LocationsBroadcaster,
  OcpiLocation,
  OcpiLocationProps,
  OcpiLocationRepository,
  OcpiEvse,
  OcpiEvseRepository,
  OcpiConnector,
  OcpiConnectorRepository,
  VariableAttributesUtil,
  OcpiLocationsUtil,
  InvalidParamException,
} from '@citrineos/ocpi-base';

@Service()
export class AdminLocationsService {
  constructor(
    private logger: Logger<ILogObj>,
    private locationMapper: LocationMapper,
    private locationRepository: SequelizeLocationRepository,
    private ocpiLocationRepository: OcpiLocationRepository,
    private ocpiEvseRepository: OcpiEvseRepository,
    private ocpiConnectorRepository: OcpiConnectorRepository,
    private locationsBroadcaster: LocationsBroadcaster,
    private variableAttributesUtil: VariableAttributesUtil,
    private ocpiLocationsUtil: OcpiLocationsUtil,
  ) {}

  public async createOrUpdateLocation(
    adminLocationDto: AdminLocationDTO,
    broadcast: boolean,
  ): Promise<LocationDTO> {
    this.logger.debug(
      adminLocationDto.id
        ? `Updating Location ${adminLocationDto.id}`
        : `Creating Location ${adminLocationDto.name}`,
    );

    const [invalidLocation, message] = AdminLocationDTO.IS_LOCATION_INVALID(adminLocationDto);
    if (invalidLocation) {
      throw new InvalidParamException(message ?? 'Invalid location request.');
    }

    const [ocpiLocation, citrineLocation] =
      this.mapAdminLocationDtoToEntities(adminLocationDto);
    const savedCitrineLocation =
      await this.locationRepository.createOrUpdateLocationWithChargingStations(
        citrineLocation,
      );
    ocpiLocation.coreLocationId = savedCitrineLocation.id;
    const savedOcpiLocation =
      await this.ocpiLocationRepository.createOrUpdateOcpiLocation(
        ocpiLocation,
      );

    if (!savedOcpiLocation) {
      throw new Error('Location could not be saved due to database error.');
    }

    for (const adminEvse of adminLocationDto.evses ?? []) {
      await this.ocpiEvseRepository.createOrUpdateOcpiEvse(
        this.mapAdminEvseDtoToOcpiEvse(adminEvse),
      );
      for (const adminConnector of adminEvse.connectors ?? []) {
        await this.ocpiConnectorRepository.createOrUpdateOcpiConnector(
          this.mapAdminConnectorToOcpiConnector(adminConnector, adminEvse),
        );
      }
    }

    let chargingStationVariableAttributesMap = {};

    if (savedCitrineLocation.chargingPool) {
      chargingStationVariableAttributesMap =
        await this.variableAttributesUtil.createChargingStationVariableAttributesMap(
          savedCitrineLocation.chargingPool.map((station) => station.id),
        );
      savedOcpiLocation.ocpiEvses =
        await this.ocpiLocationsUtil.createOcpiEvsesInfoMap(
          chargingStationVariableAttributesMap,
        );
    }

    const locationDto = this.locationMapper.mapToOcpiLocation(
      savedCitrineLocation,
      chargingStationVariableAttributesMap,
      savedOcpiLocation,
    );

    if (broadcast) {
      await this.locationsBroadcaster.broadcastOnLocationCreateOrUpdate(
        locationDto,
      );
    }

    return locationDto;
  }

  mapAdminLocationDtoToEntities(
    adminLocationDto: AdminLocationDTO,
  ): [Partial<OcpiLocation>, Partial<Location>] {
    const ocpiLocation: Partial<OcpiLocation> = {};
    ocpiLocation[OcpiLocationProps.countryCode] = adminLocationDto.country_code;
    ocpiLocation[OcpiLocationProps.partyId] = adminLocationDto.party_id;
    ocpiLocation[OcpiLocationProps.publish] = adminLocationDto.publish;
    ocpiLocation[OcpiLocationProps.lastUpdated] = new Date();
    ocpiLocation[OcpiLocationProps.timeZone] = adminLocationDto.time_zone;

    const citrineLocation: Partial<Location> = {};
    citrineLocation.id = adminLocationDto.id;
    citrineLocation.name = adminLocationDto.name;
    citrineLocation.address = adminLocationDto.address;
    citrineLocation.city = adminLocationDto.city;
    citrineLocation.postalCode = adminLocationDto.postal_code;
    citrineLocation.state = adminLocationDto.state;
    citrineLocation.country = adminLocationDto.country;

    if (adminLocationDto.coordinates) {
      citrineLocation.coordinates = {
        type: 'Point',
        coordinates: [
          Number(adminLocationDto.coordinates.longitude),
          Number(adminLocationDto.coordinates.latitude),
        ],
      };
    }

    if (adminLocationDto.evses) {
      const newStationIds = [
        ...new Set(adminLocationDto.evses.map((evse) => evse.station_id)),
      ];
      for (const stationId of newStationIds) {
        const chargingStation = ChargingStation.build({ id: stationId });
        citrineLocation.chargingPool = citrineLocation.chargingPool
          ? [...citrineLocation.chargingPool, chargingStation]
          : [chargingStation];
      }
    }

    return [ocpiLocation, citrineLocation];
  }

  mapAdminEvseDtoToOcpiEvse(adminEvseDto: AdminEvseDTO): OcpiEvse {
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
    adminEvseDto: AdminEvseDTO,
  ): OcpiConnector {
    const ocpiConnector = new OcpiConnector();
    ocpiConnector.connectorId = adminConnectorDto.id;
    ocpiConnector.evseId = adminEvseDto.id;
    ocpiConnector.stationId = adminEvseDto.station_id;
    ocpiConnector.lastUpdated = new Date();
    return ocpiConnector;
  }
}
