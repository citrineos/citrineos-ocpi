import {Get, JsonController} from 'routing-controllers';
import {HttpStatus} from '@citrineos/base';
import {VersionListResponseDTO,} from '../model/VersionListResponseDTO';
import {versionIdParam} from '../util/decorators/version.number.param';
import {Service} from 'typedi';
import {VersionDetailsResponseDTO} from "../model/VersionDetailsResponseDTO";
import {
  AsOcpiRegistrationEndpoint,
  BaseController,
  ModuleId,
  ResponseSchema,
  VersionNumber,
  VersionNumberParam,
  VersionService
} from '@citrineos/ocpi-base';
import {IVersionsModuleApi} from "./interface";

@JsonController(`/${ModuleId.Versions}`)
@Service()
export class VersionsModuleApi extends BaseController implements IVersionsModuleApi {
  constructor(readonly versionService: VersionService) {
    super();
  }

  @Get()
  @AsOcpiRegistrationEndpoint()
  @ResponseSchema(VersionListResponseDTO, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    // examples: {}, // todo real example
  })
  async getVersions(): Promise<VersionListResponseDTO> {
    return this.versionService.getVersions();
  }

  @Get(`/:${versionIdParam}`)
  @AsOcpiRegistrationEndpoint()
  @ResponseSchema(VersionDetailsResponseDTO, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    // examples: {}, // todo real example
  })
  async getVersionDetails(
    @VersionNumberParam() versionNumber: VersionNumber,
  ): Promise<VersionDetailsResponseDTO> {
    return this.versionService.getVersionDetails(versionNumber);
  }
}
