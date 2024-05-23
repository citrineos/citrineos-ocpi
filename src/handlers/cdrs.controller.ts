import {Controller, Get} from 'routing-controllers';
import {HttpStatus} from '@citrineos/base';
import {CdrListResponse} from '../model/Cdr';
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

  // todo pg 101 https://evroaming.org/app/uploads/2021/11/OCPI-2.2.1.pdf
  // todo This request is paginated, it supports the pagination related URL parameters
  @Get()
  @AsOcpiEndpoint()
  @ResponseSchema(CdrListResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
  })
  async getCdrs(
    @Paginated() paginationParams?: PaginatedParams,
  ): Promise<CdrListResponse> {
    console.log('getCdrs', paginationParams);
    return this.generateMockOcpiResponse(CdrListResponse);
  }
}
