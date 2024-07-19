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

    const [invalidLocation, message] =
      AdminLocationDTO.IS_LOCATION_INVALID(adminLocationDto);
    if (invalidLocation) {
      throw new InvalidParamException(message ?? 'Invalid location request.');
    }

    const [ocpiLocation, coreLocation] =
      this.mapAdminLocationDtoToEntities(adminLocationDto);
    const savedCoreLocation =
      await this.locationRepository.createOrUpdateLocationWithChargingStations(
        coreLocation,
      );
    ocpiLocation.coreLocationId = savedCoreLocation.id;
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

    if (savedCoreLocation.chargingPool) {
      chargingStationVariableAttributesMap =
        await this.variableAttributesUtil.createChargingStationVariableAttributesMap(
          savedCoreLocation.chargingPool.map((station) => station.id),
        );
      savedOcpiLocation.ocpiEvses =
        await this.ocpiLocationsUtil.createOcpiEvsesMap(
          chargingStationVariableAttributesMap,
        );
    }

    const locationDto = this.locationMapper.mapToOcpiLocation(
      savedCoreLocation,
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
    ocpiLocation.countryCode = adminLocationDto.country_code;
    ocpiLocation.partyId = adminLocationDto.party_id;
    ocpiLocation.publish = adminLocationDto.publish;
    ocpiLocation.lastUpdated = new Date();
    ocpiLocation.timeZone = adminLocationDto.time_zone;

    const coreLocation: Partial<Location> = {};
    coreLocation.id = adminLocationDto.id;
    coreLocation.name = adminLocationDto.name;
    coreLocation.address = adminLocationDto.address;
    coreLocation.city = adminLocationDto.city;
    coreLocation.postalCode = adminLocationDto.postal_code;
    coreLocation.state = adminLocationDto.state;
    coreLocation.country = adminLocationDto.country;

    if (adminLocationDto.coordinates) {
      coreLocation.coordinates = {
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
        coreLocation.chargingPool = coreLocation.chargingPool
          ? [...coreLocation.chargingPool, chargingStation]
          : [chargingStation];
      }
    }

    return [ocpiLocation, coreLocation];
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
