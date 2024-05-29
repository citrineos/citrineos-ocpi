import {Controller, Get} from 'routing-controllers';
import {HttpStatus} from '@citrineos/base';
import {PaginatedCdrResponse} from '../model/Cdr';
import {BaseController} from './base.controller';
import {AsOcpiFunctionalEndpoint} from '../util/decorators/as.ocpi.functional.endpoint';
import {ResponseSchema} from '../openapi-spec-helper';
import {Service} from 'typedi';
import {PaginatedParams} from './param/paginated.params';
import {Paginated} from '../util/decorators/paginated';
import {ModuleId} from "../model/ModuleId";

@Controller(`/${ModuleId.Cdrs}`)
@Service()
export class CdrsController extends BaseController {

  @Get()
  @AsOcpiFunctionalEndpoint()
  @ResponseSchema(PaginatedCdrResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
  })
  async getCdrs(
    @Paginated() paginationParams?: PaginatedParams,
  ): Promise<PaginatedCdrResponse> {
    console.log('getCdrs', paginationParams);
    return await this.generateMockOcpiPaginatedResponse(PaginatedCdrResponse, paginationParams);
  }
}
