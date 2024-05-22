import {Controller, Get, QueryParams} from 'routing-controllers';
import {HttpStatus} from '@citrineos/base';
import {CdrListResponse} from '../model/Cdr';
import {BaseController} from './base.controller';
import {AsOcpiEndpoint} from '../util/decorators/as.ocpi.endpoint';
import {OcpiModules} from '../apis/BaseApi';
import {ResponseSchema} from '../util/openapi';
import {Service} from 'typedi';
import {FromToOffsetLimitQuery} from '../apis/params/from.to.offset.limit.query';

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
    @QueryParams() _query?: FromToOffsetLimitQuery,
  ): Promise<CdrListResponse> {
    console.log('getCdrs', _query);
    return this.generateMockOcpiResponse(CdrListResponse);
  }
}
