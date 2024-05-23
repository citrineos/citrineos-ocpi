import {Controller, Get} from 'routing-controllers';
import {HttpStatus} from '@citrineos/base';
import {PaginatedCdrResponse} from '../model/Cdr';
import {BaseController} from './base.controller';
import {AsOcpiEndpoint} from '../util/decorators/as.ocpi.endpoint';
import {OcpiModules} from '../trigger/BaseApi';
import {ResponseSchema} from '../openapi-spec-helper';
import {Service} from 'typedi';
import {PaginatedParams} from '../trigger/param/paginated.params';
import {Paginated} from "../util/decorators/paginated";

@Controller(`/${OcpiModules.Cdrs}`)
@Service()
export class CdrsController extends BaseController {

  @Get()
  @AsOcpiEndpoint()
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
