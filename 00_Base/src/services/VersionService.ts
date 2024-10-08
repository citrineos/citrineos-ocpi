import { VersionRepository } from '../repository/VersionRepository';
import { Version } from '../model/Version';
import { OcpiNamespace } from '../util/OcpiNamespace';
import { VersionNumber } from '../model/VersionNumber';
import { Service } from 'typedi';
import { NotFoundError } from 'routing-controllers';
import { VersionDetailsResponseDTO } from '../model/DTO/VersionDetailsResponseDTO';
import { VersionListResponseDTO } from '../model/DTO/VersionListResponseDTO';
import { VersionEndpoint } from '../model/VersionEndpoint';

@Service()
export class VersionService {
  constructor(private versionRepository: VersionRepository) {}

  async getVersions(): Promise<VersionListResponseDTO> {
    const versions: Version[] = await this.versionRepository.readAllByQuery({});
    return VersionListResponseDTO.build(
      versions.map((version) => version.toVersionDTO()),
    );
  }

  async getVersionDetails(
    version: VersionNumber,
  ): Promise<VersionDetailsResponseDTO> {
    const versionDetail: Version | undefined =
      await this.versionRepository.readOnlyOneByQuery(
        {
          where: {
            version: version,
          },
          include: [VersionEndpoint],
        },
        OcpiNamespace.Version,
      );
    if (!versionDetail) {
      throw new NotFoundError('Version not found');
    }
    return VersionDetailsResponseDTO.build(versionDetail.toVersionDetailsDTO());
  }
}
