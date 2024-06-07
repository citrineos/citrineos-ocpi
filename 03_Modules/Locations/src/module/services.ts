import { SequelizeDeviceModelRepository, SequelizeLocationRepository, VariableAttribute } from '@citrineos/data/src/layers/sequelize';
import { Service } from 'typedi';
import { CitrineOcpiLocationMapper } from './mapper/CitrineOcpiLocationMapper';

@Service()
export class LocationsService {
  // TODO provide flexibility for ocpi location mapper interface
  constructor(
    private locationRepository: SequelizeLocationRepository,
    private deviceModelRepository: SequelizeDeviceModelRepository,
    private locationMapper: CitrineOcpiLocationMapper
  ) {
  }

  async getLocationById(id: string) {
    const evseVariableAtributesMap: Record<string, VariableAttribute[]> = {};
    const ocppLocation = await this.locationRepository.readByKey(id);
    ocppLocation.chargingPool.forEach(async chargingStation => {
      const variableAttributes = await this.deviceModelRepository.readAllByQuery({
        stationId: chargingStation.id
      });

      evseVariableAtributesMap[chargingStation.id] = variableAttributes;
    });

    return this.locationMapper.mapToOcpiLocation(ocppLocation, evseVariableAtributesMap);
  }

  async getLocationByEvseId(id: string, evseId: string) {

  }
  
  // async getLocations(
  //   paginatedParams: PaginatedParams,
  // ): Promise<PaginatedLocationResponse> {
  //   const locations = await this.locationsRepository.getLocations(
  //     paginatedParams.limit, paginatedParams.offset,
  //     paginatedParams.date_from, paginatedParams.date_to)
  // }
}
