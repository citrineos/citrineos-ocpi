import {VersionRepository} from '../repository/version.repository';
import {Version, } from '../model/Version';
import {OcpiNamespace} from '../util/ocpi.namespace';
import {VersionNumber} from '../model/VersionNumber';
import {Service} from 'typedi';
import {Endpoint} from '../model/Endpoint';
import {NotFoundError} from "routing-controllers";
import {ClientInformationRepository} from "../repository/client.information.repository";
import {VersionDetailsResponseDTO} from "../model/VersionDetailsResponseDTO";
import {VersionListResponseDTO} from "../model/VersionListResponseDTO";

@Service()
export class VersionService {
  constructor(
    private clientInformationRepository: ClientInformationRepository,
    private versionRepository: VersionRepository,
  ) {
  }

  async getVersions(token: string): Promise<VersionListResponseDTO> {
    await this.clientInformationRepository.authorizeToken(token);
    const versions: Version[] = await this.versionRepository.readAllByQuery({});
    return VersionListResponseDTO.build(
      versions.map((version) => version.toVersionDTO()),
    );
  }

  async getVersionDetails(
    token: string,
    version: VersionNumber,
  ): Promise<VersionDetailsResponseDTO> {
    await this.clientInformationRepository.authorizeToken(token);
    const versionDetail: Version | undefined =
      await this.versionRepository.readOnlyOneByQuery(
        {
          where: {version: version},
          include: [Endpoint],
        },
        OcpiNamespace.Version,
      );
    if (!versionDetail) {
      throw new NotFoundError('Version not found');
    }
    return VersionDetailsResponseDTO.build(versionDetail.toVersionDetailsDTO());
  }
}
