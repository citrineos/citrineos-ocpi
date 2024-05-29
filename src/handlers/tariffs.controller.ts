import {Controller, Get} from 'routing-controllers';
import {HttpStatus} from '@citrineos/base';
import {BaseController} from './base.controller';
import {AsOcpiFunctionalEndpoint} from '../util/decorators/as.ocpi.functional.endpoint';
import {PaginatedTariffResponse} from '../model/Tariff';
import {ResponseSchema} from '../openapi-spec-helper';
import {Service} from 'typedi';
import {PaginatedParams} from './param/paginated.params';
import {Paginated} from '../util/decorators/paginated';
import {ModuleId} from "../model/ModuleId";

@Controller(`/${ModuleId.Tariffs}`)
@Service()
export class TariffsController extends BaseController {

  @Get()
  @AsOcpiFunctionalEndpoint()
  @ResponseSchema(PaginatedTariffResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
  })
  async getTariffs(
    @Paginated() paginationParams?: PaginatedParams,
  ): Promise<PaginatedTariffResponse> {
    console.log('getTariffs', paginationParams);
    return await this.generateMockOcpiPaginatedResponse(PaginatedTariffResponse, paginationParams);
  }
}
