import {Get, JsonController} from 'routing-controllers';
import {Service} from 'typedi';
import {
  AsOcpiRegistrationEndpoint,
  BaseController,
  ClientVersion,
  Endpoint,
  generateMockOcpiResponse,
  InterfaceRole,
  ModuleId,
  ResponseSchema,
  VersionDetailsResponseDTO,
  VersionListResponseDTO,
  VersionNumber,
  VersionNumberParam
} from '@citrineos/ocpi-base';
import {HttpStatus} from '@citrineos/base';

const VERSION_LIST_MOCK = generateMockOcpiResponse(VersionListResponseDTO); // todo create real mocks for tests
const VERSION_DETAILS_MOCK = generateMockOcpiResponse(
  VersionDetailsResponseDTO,
); // todo create real mocks for tests
const EMSP_HOST = 'http://localhost:8086';
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
