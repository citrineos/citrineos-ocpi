import {Get, JsonController} from '@citrineos/ocpi-base';
import {ModuleId} from '../model/ModuleId';
import {Service} from 'typedi';
import {BaseController, generateMockOcpiResponse,} from '../handlers/base.controller';
import {AsOcpiRegistrationEndpoint} from '../util/decorators/as.ocpi.registration.endpoint';
import {ResponseSchema} from '../../../00_Base/src/openapi-spec-helper';
import {HttpStatus} from '@citrineos/base';
import {VersionNumberParam} from '../util/decorators/version.number.param';
import {VersionNumber} from '../model/VersionNumber';
import {Endpoint} from '../model/Endpoint';
import {InterfaceRole} from '../model/InterfaceRole';
import {VersionDetailsResponseDTO} from "../model/VersionDetailsResponseDTO";
import {VersionListResponseDTO} from "../model/VersionListResponseDTO";
import {ClientVersion} from "../model/client.version";

const VERSION_LIST_MOCK = generateMockOcpiResponse(VersionListResponseDTO); // todo create real mocks for tests
const VERSION_DETAILS_MOCK = generateMockOcpiResponse(
  VersionDetailsResponseDTO,
); // todo create real mocks for tests
const EMSP_HOST = 'https://localhost:8086';
const EMSP_BASE_URL = `${EMSP_HOST}/ocpi/2.2.1`;

@JsonController(`/${ModuleId.Versions}`)
@Service()
export class VersionsController extends BaseController {
  version: ClientVersion;

  constructor() {
    super();
    this.version = ClientVersion.buildClientVersion(
      VersionNumber.TWO_DOT_TWO_DOT_ONE,
      `${EMSP_HOST}/ocpi/versions/2.2.1/`,
      [
        Endpoint.buildEndpoint(
          ModuleId.Credentials,
          InterfaceRole.SENDER,
          `${EMSP_BASE_URL}/credentials/`,
        ),
        Endpoint.buildEndpoint(
          ModuleId.Locations,
          InterfaceRole.SENDER,
          `${EMSP_BASE_URL}/locations/`,
        ),
      ],
    );
  }

  @Get()
  @AsOcpiRegistrationEndpoint()
  @ResponseSchema(VersionDetailsResponseDTO, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: {
      success: VERSION_DETAILS_MOCK,
    },
  })
  async getVersions(): Promise<VersionListResponseDTO> {
    console.log('mock getVersions returning', VERSION_LIST_MOCK);
    return VersionListResponseDTO.build([this.version.toVersionDTO()]);
  }

  @Get('/:versionId')
  @AsOcpiRegistrationEndpoint()
  @ResponseSchema(VersionDetailsResponseDTO, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: {
      success: VERSION_DETAILS_MOCK,
    },
  })
  async getVersion(
    @VersionNumberParam() _versionId: VersionNumber,
  ): Promise<VersionDetailsResponseDTO> {
    return VersionDetailsResponseDTO.build(this.version.toVersionDetailsDTO());
  }
}
