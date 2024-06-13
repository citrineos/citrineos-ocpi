import { Get, JsonController } from 'routing-controllers';
import { HttpStatus } from '@citrineos/base';
import {
  BaseController,
  generateMockOcpiPaginatedResponse,
} from './base.controller';
import { AsOcpiFunctionalEndpoint } from '../util/decorators/as.ocpi.functional.endpoint';
import { PaginatedTariffResponse } from '../model/Tariff';
import { Service } from 'typedi';
import { PaginatedParams } from './param/paginated.params';
import { Paginated } from '../util/decorators/paginated';
import { ModuleId } from '../model/ModuleId';
import {
  versionIdParam,
  VersionNumberParam,
} from '../util/decorators/version.number.param';
import { VersionNumber } from '../model/VersionNumber';
import { ResponseSchema } from '../../../00_Base/src/openapi-spec-helper';

const MOCK = generateMockOcpiPaginatedResponse(
  PaginatedTariffResponse,
  new PaginatedParams(),
);

@JsonController(`/:${versionIdParam}/${ModuleId.Tariffs}`)
@Service()
export class TariffsController extends BaseController {
  @Get()
  @AsOcpiFunctionalEndpoint()
  @ResponseSchema(PaginatedTariffResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: {
      success: {
        summary: 'A successful response',
        value: MOCK,
      },
    },
  })
  async getTariffs(
    @VersionNumberParam() _version: VersionNumber,
    @Paginated() paginationParams?: PaginatedParams,
  ): Promise<PaginatedTariffResponse> {
    console.log('getTariffs', paginationParams);
    return MOCK;
  }
}
