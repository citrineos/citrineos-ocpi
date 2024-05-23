import {Body, Controller, Delete, Get, Post, Put} from 'routing-controllers';
import {OcpiModules} from '../trigger/BaseApi';
import {BaseController} from './base.controller';
import {Credentials, CredentialsResponse} from '../model/Credentials';
import {ResponseSchema} from '../openapi-spec-helper';
import {HttpStatus} from '@citrineos/base';
import {OcpiEmptyResponse} from '../model/ocpi.empty.response';
import {CredentialsService} from '../service/credentials.service';
import {VersionNumber} from '../model/VersionNumber';
import {VersionNumberParam} from '../util/decorators/version.number.param';
import {Service} from 'typedi';
import {AuthToken} from '../util/decorators/auth.token';
import {AsOcpiOpenRoutingEndpoint} from "../util/decorators/as.ocpi.open.routing.endpoint";

@Controller(`/${OcpiModules.Credentials}`)
@Service()
export class CredentialsController extends BaseController {

  constructor(readonly credentialsService: CredentialsService) {
    super();
  }

  @Get()
  @AsOcpiOpenRoutingEndpoint()
  @ResponseSchema(CredentialsResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
  })
  async getCredentials(
    @AuthToken() token: string,
  ): Promise<CredentialsResponse> {
    return this.credentialsService?.getCredentials(token);
  }

  @Post()
  @AsOcpiOpenRoutingEndpoint()
  @ResponseSchema(CredentialsResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
  })
  async postCredentials(
    @AuthToken() token: string,
    @Body() credentials: Credentials,
    @VersionNumberParam() version: VersionNumber
  ): Promise<CredentialsResponse> {
    return this.credentialsService?.postCredentials(token, credentials, version);
  }

  @Put()
  @AsOcpiOpenRoutingEndpoint()
  @ResponseSchema(CredentialsResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
  })
  async putCredentials(
    @AuthToken() token: string,
    @Body() credentials: Credentials,
    @VersionNumberParam() version: VersionNumber
  ): Promise<CredentialsResponse> {
    return this.credentialsService?.putCredentials(token, credentials, version);
  }

  @Delete()
  @AsOcpiOpenRoutingEndpoint()
  @ResponseSchema(OcpiEmptyResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
  })
  async deleteCredentials(
    @AuthToken() token: string
  ): Promise<OcpiEmptyResponse> {
    return this.credentialsService?.deleteCredentials(token);
  }
}
