import {Controller, Get, Param} from "routing-controllers";
import {OcpiModules} from "../apis/BaseApi";
import {BaseController} from "./base.controller";
import {AsOcpiEndpoint} from "../util/decorators/as.ocpi.endpoint";
import {ResponseSchema} from "../util/openapi";
import {HttpStatus} from "@citrineos/base";
import {VersionDetailsDTOResponse, VersionDTOListResponse} from "../model/Version";

@Controller(`/${OcpiModules.Versions}`)
export class VersionsController extends BaseController {

  @Get()
  @ResponseSchema(VersionDTOListResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
  })
  async getVersions(): Promise<VersionDTOListResponse> {
    return this.generateMockOcpiResponse(VersionDTOListResponse);
  }

  @Get('/:versionId')
  @AsOcpiEndpoint()
  @ResponseSchema(VersionDetailsDTOResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
  })
  async getVersion(
    @Param('versionId') _versionId: string
  ): Promise<VersionDetailsDTOResponse> {
    return this.generateMockOcpiResponse(VersionDetailsDTOResponse);
  }
}
