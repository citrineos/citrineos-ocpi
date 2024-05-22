import {VersionRepository} from '../repository/version.repository';
import {CredentialsRepository} from '../repository/credentials.repository';
import {Version, VersionDetailsDTOResponse, VersionDTOListResponse} from '../model/Version';
import {OcpiNamespace} from '../util/ocpi.namespace';
import {VersionNumber} from '../model/VersionNumber';
import {Service} from 'typedi';
import {OcpiResponseStatusCode} from "../util/ocpi.response";

@Service()
export class VersionService {
  constructor(
    private credentialsRepository: CredentialsRepository,
    private versionRepository: VersionRepository,
  ) {
  }

  async getVersions(
    token: string
  ): Promise<VersionDTOListResponse> {
    await this.credentialsRepository.authorizeToken(token);
    const versions: Version[] = await this.versionRepository.readAllByQuery(
      {},
      OcpiNamespace.Version,
    );
    return VersionDTOListResponse.build(
      OcpiResponseStatusCode.GenericSuccessCode,
      versions.map((version) => version.toVersionDTO()),
    );
  }

  async getVersion(
    token: string,
    versionId: VersionNumber
  ): Promise<VersionDetailsDTOResponse> {
    await this.credentialsRepository.authorizeToken(token);
    const version: Version = await this.versionRepository.readByKey(
      versionId,
      OcpiNamespace.Version,
    );
    return VersionDetailsDTOResponse.build(OcpiResponseStatusCode.GenericSuccessCode, version.toVersionDetailsDTO());
  }
}
