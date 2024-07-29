import { BaseClientApi } from './BaseClientApi';
import { ModuleId } from '../model/ModuleId';
import { OcpiRegistrationParams } from './util/ocpi.registration.params';
import { CredentialsResponse } from '../model/CredentialsResponse';
import { IHeaders } from 'typed-rest-client/Interfaces';
import { PostCredentialsParams } from './param/credentials/post.credentials.params';
import { PutCredentialsParams } from './param/credentials/put.credentials.params';
import { Service } from 'typedi';
import { VersionNumber } from '../model/VersionNumber';

@Service()
export class CredentialsClientApi extends BaseClientApi {
  CONTROLLER_PATH = ModuleId.Credentials;

  async getCredentials(
    params: OcpiRegistrationParams,
  ): Promise<CredentialsResponse> {
    this.validateOcpiRegistrationParams(params);
    const additionalHeaders: IHeaders = this.getOcpiRegistrationHeaders(params);
    return await this.get(CredentialsResponse, {
      additionalHeaders,
    });
  }

  async postCredentials(
    params: PostCredentialsParams,
  ): Promise<CredentialsResponse> {
    this.validateOcpiRegistrationParams(params);
    this.validateRequiredParam(params, 'credentials');
    const additionalHeaders: IHeaders = this.getOcpiRegistrationHeaders(params);
    return await this.create(
      CredentialsResponse,
      {
        additionalHeaders,
      },
      params.credentials,
    );
  }

  async putCredentials(
    params: PutCredentialsParams,
  ): Promise<CredentialsResponse> {
    params.version = params.version ?? VersionNumber.TWO_DOT_TWO_DOT_ONE;
    this.validateOcpiRegistrationParams(params);
    this.validateRequiredParam(params, 'credentials');
    const additionalHeaders: IHeaders = this.getOcpiRegistrationHeaders(params);
    return await this.replace(
      CredentialsResponse,
      {
        version: params.version,
        path: '',
        additionalHeaders,
      },
      params.credentials,
    );
  }

  async deleteCredentials(
    params: PutCredentialsParams,
  ): Promise<CredentialsResponse> {
    this.validateOcpiRegistrationParams(params);
    const additionalHeaders: IHeaders = this.getOcpiRegistrationHeaders(params);
    return await this.del(CredentialsResponse, {
      additionalHeaders,
    });
  }
}
