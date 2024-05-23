import {Controller, Get} from 'routing-controllers';
import {HttpStatus} from '@citrineos/base';
import {BaseController} from './base.controller';
import {AsOcpiEndpoint} from '../util/decorators/as.ocpi.endpoint';
import {OcpiModules} from '../trigger/BaseApi';
import {PaginatedTariffResponse} from '../model/Tariff';
import {ResponseSchema} from '../openapi-spec-helper';
import {Service} from 'typedi';
import {PaginatedParams} from '../trigger/param/paginated.params';
import {Paginated} from "../util/decorators/paginated";

@Controller(`/${OcpiModules.Tariffs}`)
@Service()
export class TariffsController extends BaseController {

  @Get()
  @AsOcpiEndpoint()
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
