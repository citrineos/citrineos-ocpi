import {Body, Delete, Get, JsonController, Post, Put} from 'routing-controllers';
import {BaseController, generateMockOcpiResponse} from './base.controller';
import {CredentialsDTO} from '../model/CredentialsDTO';
import {ResponseSchema} from '../openapi-spec-helper';
import {HttpStatus} from '@citrineos/base';
import {OcpiEmptyResponse} from '../model/ocpi.empty.response';
import {CredentialsService} from '../service/credentials.service';
import {VersionNumber} from '../model/VersionNumber';
import {versionIdParam, VersionNumberParam} from '../util/decorators/version.number.param';
import {Service} from 'typedi';
import {AuthToken} from '../util/decorators/auth.token';
import {AsOcpiRegistrationEndpoint} from '../util/decorators/as.ocpi.registration.endpoint';
import {ModuleId} from '../model/ModuleId';
import {CredentialsResponse} from "../model/credentials.response";
import {OcpiResponseStatusCode} from "../model/ocpi.response";
import {OcpiLogger} from "../util/logger";


const MOCK_CREDENTIALS_RESPONSE = generateMockOcpiResponse(CredentialsResponse);
const MOCK_EMPTY = generateMockOcpiResponse(OcpiEmptyResponse);

@JsonController(`/:${versionIdParam}/${ModuleId.Credentials}`)
@Service()
export class CredentialsController extends BaseController {
  constructor(
    readonly logger: OcpiLogger,
    readonly credentialsService: CredentialsService
  ) {
    super();
  }

  @Get()
  @AsOcpiRegistrationEndpoint()
  @ResponseSchema(CredentialsResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: {
      success: {
        summary: 'A successful response',
        value: MOCK_CREDENTIALS_RESPONSE
      },
    },
  })
  async getCredentials(
    @VersionNumberParam() _version: VersionNumber,
    @AuthToken() token: string,
  ): Promise<CredentialsResponse> {
    this.logger.info('getCredentials', _version);
    const credentials = await this.credentialsService?.getCredentials(token);
    return CredentialsResponse.build(credentials.toCredentialsDTO());
  }

  @Post()
  @AsOcpiRegistrationEndpoint()
  @ResponseSchema(CredentialsResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: {
      success: {
        summary: 'A successful response',
        value: MOCK_CREDENTIALS_RESPONSE
      },
    },
  })
  async postCredentials(
    @VersionNumberParam() version: VersionNumber,
    @AuthToken() token: string,
    @Body() credentials: CredentialsDTO,
  ): Promise<CredentialsResponse> {
    this.logger.info('postCredentials', version, credentials);
    const clientInformation = await this.credentialsService?.postCredentials(token, credentials, version);
    return CredentialsResponse.build(clientInformation.toCredentialsDTO());
  }

  @Put()
  @AsOcpiRegistrationEndpoint()
  @ResponseSchema(CredentialsResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: {
      success: {
        summary: 'A successful response',
        value: MOCK_CREDENTIALS_RESPONSE
      },
    },
  })
  async putCredentials(
    @VersionNumberParam() version: VersionNumber,
    @AuthToken() token: string,
    @Body() credentials: CredentialsDTO,
  ): Promise<CredentialsResponse> {
    this.logger.info('putCredentials', version, credentials);
    const clientInformation = await this.credentialsService?.putCredentials(token, credentials, version);
    return CredentialsResponse.build(clientInformation.toCredentialsDTO());
  }

  @Delete()
  @AsOcpiRegistrationEndpoint()
  @ResponseSchema(OcpiEmptyResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: {
      success: {
        summary: 'A successful response',
        value: MOCK_EMPTY
      },
    },
  })
  async deleteCredentials(
    @VersionNumberParam() _version: VersionNumber,
    @AuthToken() token: string,
  ): Promise<OcpiEmptyResponse> {
    this.logger.info('deleteCredentials', _version);
    await this.credentialsService?.deleteCredentials(token);
    return OcpiEmptyResponse.build(OcpiResponseStatusCode.GenericSuccessCode);
  }
}
