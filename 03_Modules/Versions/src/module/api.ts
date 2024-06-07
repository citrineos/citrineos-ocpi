import { Get, JsonController } from 'routing-controllers';
import { BaseController } from '@citrineos/ocpi-base';
import { ResponseSchema } from '@citrineos/ocpi-base';
import { HttpStatus } from '@citrineos/base';
import {
  VersionDetailsDTOResponse,
  VersionDTOListResponse,
} from '@citrineos/ocpi-base';
import { VersionService } from '@citrineos/ocpi-base';
import { VersionNumberParam } from '@citrineos/ocpi-base';
import { VersionNumber } from '@citrineos/ocpi-base';
import { Service } from 'typedi';
import { AuthToken } from '@citrineos/ocpi-base';
import { AsOcpiRegistrationEndpoint } from '@citrineos/ocpi-base';
import { ModuleId } from '@citrineos/ocpi-base';
import { IVersionsModuleApi } from "./interface";

@JsonController(`/${ModuleId.Versions}`)
@Service()
export class VersionsModuleApi extends BaseController implements IVersionsModuleApi{
  constructor(readonly versionService: VersionService) {
    super();
  }

  @Get()
  @AsOcpiRegistrationEndpoint()
  @ResponseSchema(VersionDTOListResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: {}, // todo real example
  })
  async getVersions(
    @AuthToken() token: string,
  ): Promise<VersionDTOListResponse> {
    return this.versionService.getVersions(token);
  }

  @Get('/:versionNumberId')
  @AsOcpiRegistrationEndpoint()
  @ResponseSchema(VersionDetailsDTOResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: {}, // todo real example
  })
  async getVersionDetails(
    @AuthToken() token: string,
    @VersionNumberParam() versionNumberId: VersionNumber,
  ): Promise<VersionDetailsDTOResponse> {
    return this.versionService.getVersionDetails(token, versionNumberId);
  }
}
