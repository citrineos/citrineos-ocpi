import {Controller, Get} from 'routing-controllers';
import {OcpiModules} from '../apis/BaseApi';
import {BaseController} from './base.controller';
import {ResponseSchema} from '../util/openapi';
import {HttpStatus} from '@citrineos/base';
import {VersionDetailsDTOResponse, VersionDTOListResponse} from '../model/Version';
import {VersionService} from '../service/version.service';
import {VersionNumberParam} from '../util/decorators/version.number.param';
import {VersionNumber} from '../model/VersionNumber';
import {Service} from 'typedi';
import {AuthToken} from '../util/decorators/auth.token';
import {AsOcpiOpenRoutingEndpoint} from "../util/decorators/as.ocpi.open.routing.endpoint";

@Controller(`/${OcpiModules.Versions}`)
@Service()
export class VersionsController extends BaseController {

  constructor(
    readonly versionService: VersionService
  ) {
    super();
  }

  @Get()
  @AsOcpiOpenRoutingEndpoint()
  @ResponseSchema(VersionDTOListResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
  })
  async getVersions(
    @AuthToken() token: string
  ): Promise<VersionDTOListResponse> {
    return this.versionService.getVersions(token);
  }

  @Get('/:versionId')
  @AsOcpiOpenRoutingEndpoint()
  @ResponseSchema(VersionDetailsDTOResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
  })
  async getVersionDetails(
    @AuthToken() token: string,
    @VersionNumberParam() versionId: VersionNumber,
  ): Promise<VersionDetailsDTOResponse> {
    return this.versionService.getVersionDetails(token, versionId);
  }
}
