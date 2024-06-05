import { SequelizeLocationRepository } from '@citrineos/data/src/layers/sequelize';
import { Service } from 'typedi';

@Service()
export class LocationsService {
  constructor(
    private locationRepository: SequelizeLocationRepository,
  ) {
  }
  
  // async getLocations(
  //   paginatedParams: PaginatedParams,
  // ): Promise<PaginatedLocationResponse> {
  //   const locations = await this.locationsRepository.getLocations(
  //     paginatedParams.limit, paginatedParams.offset,
  //     paginatedParams.date_from, paginatedParams.date_to)
  // }

  // async getVersions(
  //   token: string
  // ): Promise<VersionDTOListResponse> {
  //   await this.credentialsRepository.authorizeToken(token);
  //   const versions: Version[] = await this.versionRepository.readAllByQuery(
  //     {},
  //     OcpiNamespace.Version,
  //   );
  //   return VersionDTOListResponse.build(
  //     OcpiResponseStatusCode.GenericSuccessCode,
  //     versions.map((version) => version.toVersionDTO()),
  //   );
  // }

  // async getVersionDetails(
  //   token: string,
  //   versionId: VersionNumber
  // ): Promise<VersionDetailsDTOResponse> {
  //   await this.credentialsRepository.authorizeToken(token);
  //   const version: Version = await this.versionRepository.readByKey(
  //     versionId,
  //     OcpiNamespace.Version,
  //   );
  //   return VersionDetailsDTOResponse.build(OcpiResponseStatusCode.GenericSuccessCode, version.toVersionDetailsDTO());
  // }
}
