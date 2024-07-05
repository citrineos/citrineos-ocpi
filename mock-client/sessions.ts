import { JsonController, Param, Patch } from 'routing-controllers';
import { Service } from 'typedi';
import {
  BaseController,
  ModuleId,
  OcpiEmptyResponse,
  OcpiResponseStatusCode,
  ResponseSchema,
  VersionDetailsResponseDTO,
  versionIdParam,
  VersionNumber,
  VersionNumberParam,
} from '@citrineos/ocpi-base';
import { HttpStatus } from '@citrineos/base';

const PUT_SESSION_MOCK = OcpiEmptyResponse.build(
  OcpiResponseStatusCode.GenericSuccessCode,
);

@JsonController(`/:${versionIdParam}/${ModuleId.Sessions}`)
@Service()
export class SessionsController extends BaseController {
  constructor() {
    super();
  }

  @Patch('/:countryCode/:partyId/:sessionId')
  @ResponseSchema(VersionDetailsResponseDTO, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: {
      success: PUT_SESSION_MOCK,
    },
  })
  async getVersions(
    @Param('countryCode') _countryCode: string,
    @Param('partyId') _partyId: string,
    @Param('sessionId') _sessionId: string,
    @VersionNumberParam() _versionNumber: VersionNumber,
  ): Promise<OcpiEmptyResponse> {
    console.log('mock getVersions returning', PUT_SESSION_MOCK);
    return PUT_SESSION_MOCK;
  }
}
