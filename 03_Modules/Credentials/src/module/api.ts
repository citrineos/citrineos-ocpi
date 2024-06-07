import { Body, Controller, Delete, Get, Post, Put } from 'routing-controllers';
import { BaseController } from '@citrineos/ocpi-base';
import { Credentials, CredentialsResponse } from '@citrineos/ocpi-base';
import { ResponseSchema } from '@citrineos/ocpi-base';
import { HttpStatus } from '@citrineos/base';
import { OcpiEmptyResponse } from '@citrineos/ocpi-base';
import { CredentialsService } from '@citrineos/ocpi-base';
import { VersionNumber } from '@citrineos/ocpi-base';
import { VersionNumberParam } from '@citrineos/ocpi-base';
import { Service } from 'typedi';
import { AuthToken } from '@citrineos/ocpi-base';
import { AsOcpiRegistrationEndpoint } from '@citrineos/ocpi-base';
import { ModuleId } from '@citrineos/ocpi-base';
import {ICredentialsModuleApi} from "./interface";

@Controller(`/${ModuleId.Credentials}`)
@Service()
export class CredentialsModuleApi extends BaseController implements ICredentialsModuleApi {
  constructor(readonly credentialsService: CredentialsService) {
    super();
  }

  @Get()
  @AsOcpiRegistrationEndpoint()
  @ResponseSchema(CredentialsResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: {}, // todo real example
  })
  async getCredentials(
    @AuthToken() token: string,
  ): Promise<CredentialsResponse> {
    return this.credentialsService?.getCredentials(token);
  }

  @Post()
  @AsOcpiRegistrationEndpoint()
  @ResponseSchema(CredentialsResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: {}, // todo real example
  })
  async postCredentials(
    @AuthToken() token: string,
    @Body() credentials: Credentials,
    @VersionNumberParam() version: VersionNumber,
  ): Promise<CredentialsResponse> {
    return this.credentialsService?.postCredentials(
      token,
      credentials,
      version,
    );
  }

  @Put()
  @AsOcpiRegistrationEndpoint()
  @ResponseSchema(CredentialsResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: {}, // todo real example
  })
  async putCredentials(
    @AuthToken() token: string,
    @Body() credentials: Credentials,
    @VersionNumberParam() version: VersionNumber,
  ): Promise<CredentialsResponse> {
    return this.credentialsService?.putCredentials(token, credentials, version);
  }

  @Delete()
  @AsOcpiRegistrationEndpoint()
  @ResponseSchema(OcpiEmptyResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: {}, // todo real example
  })
  async deleteCredentials(
    @AuthToken() token: string,
  ): Promise<OcpiEmptyResponse> {
    return this.credentialsService?.deleteCredentials(token);
  }
}
