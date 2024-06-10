import {Body, Controller, Delete, Get, Post, Put} from 'routing-controllers';
import {BaseController, generateMockOcpiResponse} from './base.controller';
import {CredentialsDTO} from '../model/CredentialsDTO';
import {ResponseSchema} from '../openapi-spec-helper';
import {HttpStatus} from '@citrineos/base';
import {OcpiEmptyResponse} from '../model/ocpi.empty.response';
import {CredentialsService} from '../service/credentials.service';
import {VersionNumber} from '../model/VersionNumber';
import {VersionNumberParam} from '../util/decorators/version.number.param';
import {Service} from 'typedi';
import {AuthToken} from '../util/decorators/auth.token';
import {AsOcpiRegistrationEndpoint} from '../util/decorators/as.ocpi.registration.endpoint';
import {ModuleId} from '../model/ModuleId';
import {CredentialsResponse} from "../model/credentials.response";


const MOCK_CREDENTIALS_RESPONSE = generateMockOcpiResponse(CredentialsResponse);
const MOCK_EMPTY = generateMockOcpiResponse(OcpiEmptyResponse);

@Controller(`/${ModuleId.Credentials}`)
@Service()
export class CredentialsController extends BaseController {
  constructor(readonly credentialsService: CredentialsService) {
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
    @AuthToken() token: string,
  ): Promise<CredentialsResponse> {
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
    @AuthToken() token: string,
    @Body() credentials: CredentialsDTO,
    @VersionNumberParam() version: VersionNumber,
  ): Promise<CredentialsResponse> {
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
    @AuthToken() token: string,
    @Body() credentials: CredentialsDTO,
    @VersionNumberParam() version: VersionNumber,
  ): Promise<CredentialsResponse> {
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
    @AuthToken() token: string,
  ): Promise<OcpiEmptyResponse> {
    return this.credentialsService?.deleteCredentials(token);
  }
}
