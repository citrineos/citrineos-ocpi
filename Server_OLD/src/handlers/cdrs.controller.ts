import {Get, JsonController} from '@citrineos/ocpi-base';
import {HttpStatus} from '@citrineos/base';
import {PaginatedCdrResponse} from '../model/Cdr';
import {BaseController, generateMockOcpiPaginatedResponse,} from './base.controller';
import {AsOcpiFunctionalEndpoint} from '../util/decorators/as.ocpi.functional.endpoint';
import {Service} from 'typedi';
import {PaginatedParams} from './param/paginated.params';
import {Paginated} from '../util/decorators/paginated';
import {ModuleId} from '../model/ModuleId';
import {versionIdParam, VersionNumberParam} from "../util/decorators/version.number.param";
import {VersionNumber} from "../model/VersionNumber";
import {ResponseSchema} from '../../../00_Base/src/openapi-spec-helper';

const MOCK = generateMockOcpiPaginatedResponse(
  PaginatedCdrResponse,
  new PaginatedParams(),
);

@JsonController(`/:${versionIdParam}/${ModuleId.Cdrs}`)
@Service()
export class CdrsController extends BaseController {
  @Get()
  @AsOcpiFunctionalEndpoint()
  @ResponseSchema(PaginatedCdrResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: {
      success: {
        summary: 'A successful response',
        value: MOCK
      },
    },
  })
  async getCdrs(
    @VersionNumberParam() _version: VersionNumber,
    @Paginated() paginationParams?: PaginatedParams,
  ): Promise<PaginatedCdrResponse> {
    console.log('getCdrs', paginationParams);
    return MOCK;
  }
}
