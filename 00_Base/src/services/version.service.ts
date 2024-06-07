import { VersionRepository } from '../repository/version.repository';
import { CredentialsRepository } from '../repository/credentials.repository';
import {
  Version,
  VersionDetailsDTOResponse,
  VersionDTOListResponse,
} from '../model/Version';
import { OcpiNamespace } from '../util/ocpi.namespace';
import { VersionNumber } from '../model/VersionNumber';
import { Service } from 'typedi';
import { Endpoint } from '../model/Endpoint';
import { NotFoundException } from '../exception/not.found.exception';

@Service()
export class VersionService {
  constructor(
    private credentialsRepository: CredentialsRepository,
    private versionRepository: VersionRepository,
  ) {}

  async getVersions(token: string): Promise<VersionDTOListResponse> {
    await this.credentialsRepository.authorizeToken(token);
    const versions: Version[] = await this.versionRepository.readAllByQuery({});
    return VersionDTOListResponse.build(
      versions.map((version) => version.toVersionDTO()),
    );
  }

  async getVersionDetails(
    token: string,
    version: VersionNumber,
  ): Promise<VersionDetailsDTOResponse> {
    await this.credentialsRepository.authorizeToken(token);
    const versionDetail: Version | undefined =
      await this.versionRepository.readOnlyOneByQuery(
        {
          where: { version: version },
          include: [Endpoint],
        },
        OcpiNamespace.Version,
      );
    if (!versionDetail) {
      throw new NotFoundException('Version not found');
    }
    return VersionDetailsDTOResponse.build(versionDetail.toVersionDetailsDTO());
  }
}
