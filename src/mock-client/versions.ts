import { Get, JsonController } from 'routing-controllers';
import { ModuleId } from '../model/ModuleId';
import { Service } from 'typedi';
import {
  BaseController,
  generateMockOcpiResponse,
} from '../handlers/base.controller';
import { AsOcpiRegistrationEndpoint } from '../util/decorators/as.ocpi.registration.endpoint';
import { ResponseSchema } from '../openapi-spec-helper';
import {
  Version,
  VersionDetailsDTOResponse,
  VersionDTOListResponse,
} from '../model/Version';
import { HttpStatus } from '@citrineos/base';
import { VersionNumberParam } from '../util/decorators/version.number.param';
import { VersionNumber } from '../model/VersionNumber';
import { Endpoint } from '../model/Endpoint';
import { InterfaceRole } from '../model/InterfaceRole';

const VERSION_LIST_MOCK = generateMockOcpiResponse(VersionDTOListResponse); // todo create real mocks for tests
const VERSION_DETAILS_MOCK = generateMockOcpiResponse(
  VersionDetailsDTOResponse,
); // todo create real mocks for tests
const EMSP_HOST = 'https://localhost:8085';
const EMSP_BASE_URL = `${EMSP_HOST}/ocpi/2.2.1`;

@JsonController(`/${ModuleId.Versions}`)
@Service()
export class VersionsController extends BaseController {
  version: Version;

  constructor() {
    super();
    this.version = Version.buildVersion(
      VersionNumber.TWO_DOT_TWO_DOT_ONE,
      `${EMSP_HOST}/ocpi/versions/2.2.1/`,
      [
        Endpoint.buildEndpoint(
          VersionNumber.TWO_DOT_TWO_DOT_ONE,
          ModuleId.Credentials,
          InterfaceRole.SENDER,
          `${EMSP_BASE_URL}/credentials/`,
        ),
        Endpoint.buildEndpoint(
          VersionNumber.TWO_DOT_TWO_DOT_ONE,
          ModuleId.Locations,
          InterfaceRole.SENDER,
          `${EMSP_BASE_URL}/locations/`,
        ),
      ],
    );
  }

  @Get()
  @AsOcpiRegistrationEndpoint()
  @ResponseSchema(VersionDetailsDTOResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: {
      success: VERSION_DETAILS_MOCK,
    },
  })
  async getVersions(): Promise<VersionDTOListResponse> {
    console.log('mock getVersions returning', VERSION_LIST_MOCK);
    return VersionDTOListResponse.build([this.version.toVersionDTO()]);
  }

  @Get('/:versionId')
  @AsOcpiRegistrationEndpoint()
  @ResponseSchema(VersionDetailsDTOResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: VERSION_DETAILS_MOCK,
  })
  async getVersion(
    @VersionNumberParam() _versionId: VersionNumber,
  ): Promise<VersionDetailsDTOResponse> {
    return VersionDetailsDTOResponse.build(this.version.toVersionDetailsDTO());
  }
}
