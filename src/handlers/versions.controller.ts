import {Get, JsonController} from 'routing-controllers';
import {BaseController} from './base.controller';
import {ResponseSchema} from '../openapi-spec-helper';
import {HttpStatus} from '@citrineos/base';
import {VersionListResponseDTO,} from '../model/VersionListResponseDTO';
import {VersionService} from '../service/version.service';
import {versionIdParam, VersionNumberParam} from '../util/decorators/version.number.param';
import {VersionNumber} from '../model/VersionNumber';
import {Service} from 'typedi';
import {AsOcpiRegistrationEndpoint} from '../util/decorators/as.ocpi.registration.endpoint';
import {ModuleId} from '../model/ModuleId';
import {VersionDetailsResponseDTO} from "../model/VersionDetailsResponseDTO";

@JsonController(`/${ModuleId.Versions}`)
@Service()
export class VersionsController extends BaseController {
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
