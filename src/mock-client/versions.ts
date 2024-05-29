import {Get, JsonController} from "routing-controllers";
import {ModuleId} from "../model/ModuleId";
import {Service} from "typedi";
import {BaseController, generateMockOcpiResponse} from "../handlers/base.controller";
import {AsOcpiRegistrationEndpoint} from "../util/decorators/as.ocpi.registration.endpoint";
import {ResponseSchema} from "../openapi-spec-helper";
import {VersionDetailsDTOResponse, VersionDTOListResponse} from "../model/Version";
import {HttpStatus} from "@citrineos/base";
import {VersionNumberParam} from "../util/decorators/version.number.param";
import {VersionNumber} from "../model/VersionNumber";

const VERSION_LIST_MOCK = generateMockOcpiResponse(VersionDTOListResponse); // todo create real mocks for tests
const VERSION_DETAILS_MOCK = generateMockOcpiResponse(VersionDetailsDTOResponse); // todo create real mocks for tests

@JsonController(`/${ModuleId.Versions}`)
@Service()
export class VersionsController extends BaseController {

  @Get()
  @AsOcpiRegistrationEndpoint()
  @ResponseSchema(VersionDetailsDTOResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: {
      success: VERSION_DETAILS_MOCK
    }
  })
  async getVersions(): Promise<VersionDTOListResponse> {
    console.log('mock getVersions returning', VERSION_LIST_MOCK);
    return VERSION_LIST_MOCK;
  }

  @Get('/:versionId')
  @AsOcpiRegistrationEndpoint()
  @ResponseSchema(VersionDetailsDTOResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: VERSION_DETAILS_MOCK
  })
  async getVersion(
    @VersionNumberParam() versionId: VersionNumber
  ): Promise<VersionDetailsDTOResponse> {
    return VERSION_DETAILS_MOCK;
  }

}
