import { Controller, Get } from 'routing-controllers';
import { HttpStatus } from '@citrineos/base';
import {
  BaseController,
  generateMockOcpiPaginatedResponse,
} from './base.controller';
import { AsOcpiFunctionalEndpoint } from '../util/decorators/as.ocpi.functional.endpoint';
import { PaginatedTariffResponse } from '../model/Tariff';
import { ResponseSchema } from '../../../00_Base/src/openapi-spec-helper';
import { Service } from 'typedi';
import { PaginatedParams } from './param/paginated.params';
import { Paginated } from '../util/decorators/paginated';
import { ModuleId } from '../model/ModuleId';

const MOCK = generateMockOcpiPaginatedResponse(
  PaginatedTariffResponse,
  new PaginatedParams(),
);

@Controller(`/${ModuleId.Tariffs}`)
@Service()
export class TariffsController extends BaseController {
  @Get()
  @AsOcpiFunctionalEndpoint()
  @ResponseSchema(PaginatedTariffResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: {
      success: MOCK,
    },
  })
  async getTariffs(
    @Paginated() paginationParams?: PaginatedParams,
  ): Promise<PaginatedTariffResponse> {
    console.log('getTariffs', paginationParams);
    return MOCK;
  }
}
