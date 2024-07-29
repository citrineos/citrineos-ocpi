import { Service } from 'typedi';
import { type ILogObj, Logger } from 'tslog';
import { ChargingStation, Location } from '@citrineos/data';
import { OcpiLocation } from '../model/OcpiLocation';
import { OcpiEvse } from '../model/OcpiEvse';
import { OcpiConnector } from '../model/OcpiConnector';
import { LocationsBroadcaster } from '../broadcaster/locations.broadcaster';
import {
  AdminConnectorDTO,
  AdminEvseDTO,
  AdminLocationDTO,
} from '../model/DTO/admin/AdminLocationDTO';
import { LocationDTO } from '../model/DTO/LocationDTO';
import { InvalidParamException } from '../exception/invalid.param.exception';
import { validate } from 'class-validator';
import { CREATE, UPDATE } from '../util/consts';
import { LocationsDatasource } from '../datasources/LocationsDatasource';

@Service()
export class AdminLocationsService {
  constructor(
    private logger: Logger<ILogObj>,
    private locationsBroadcaster: LocationsBroadcaster,
    private locationsDatasource: LocationsDatasource,
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

    const validationErrors = await validate(adminLocationDto, {
      groups: [adminLocationDto.id ? UPDATE : CREATE],
      validationError: { target: false },
    });

    if (validationErrors.length > 0) {
      throw new InvalidParamException(
        `The following properties cannot be empty: ${validationErrors.map((ve) => ve.property).join(', ')}`,
      );
    }

    const [coreLocation, ocpiLocation] =
      this.mapAdminLocationDtoToEntities(adminLocationDto);

    const evses = [];
    const connectors = [];

    for (const adminEvse of adminLocationDto.evses ?? []) {
      evses.push(this.mapAdminEvseDtoToOcpiEvse(adminEvse));
      for (const adminConnector of adminEvse.connectors ?? []) {
        connectors.push(
          this.mapAdminConnectorToOcpiConnector(adminConnector, adminEvse),
        );
      }
    }

    const locationDto =
      await this.locationsDatasource.adminCreateOrUpdateLocation(
        coreLocation,
        ocpiLocation,
        evses,
        connectors,
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
  ): [Partial<Location>, Partial<OcpiLocation>] {
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

    return [coreLocation, ocpiLocation];
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
