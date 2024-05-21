import {Controller, Get, HeaderParam} from "routing-controllers";
import {OcpiModules} from "../apis/BaseApi";
import {BaseController} from "./base.controller";
import {AsOcpiEndpoint} from "../util/decorators/as.ocpi.endpoint";
import {ResponseSchema} from "../util/openapi";
import {HttpHeader, HttpStatus} from "@citrineos/base";
import {VersionDetailsDTOResponse, VersionDTOListResponse} from "../model/Version";
import {VersionService} from "../service/version.service";
import {VersionNumberParam} from "../util/decorators/version.number.param";
import {VersionNumber} from "../model/VersionNumber";
import {Service} from "typedi";

@Controller(`/${OcpiModules.Versions}`)
@Service()
export class VersionsController extends BaseController {

  constructor(
    readonly versionService: VersionService
  ) {
    super();
  }


  @Get()
  @ResponseSchema(VersionDTOListResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
  })
  async getVersions(
    @HeaderParam(HttpHeader.Authorization) token: string
  ): Promise<VersionDTOListResponse> {
    return this.versionService.getVersions(token);
  }

  @Get('/:versionId')
  @AsOcpiEndpoint()
  @ResponseSchema(VersionDetailsDTOResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
  })
  async getVersion(
    @HeaderParam(HttpHeader.Authorization) token: string,
    @VersionNumberParam() versionId: VersionNumber,
  ): Promise<VersionDetailsDTOResponse> {
    return this.versionService.getVersion(token, versionId);
  }
}
