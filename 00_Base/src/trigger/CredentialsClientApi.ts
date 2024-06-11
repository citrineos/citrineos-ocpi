import {BaseClientApi} from "./BaseClientApi";
import {ModuleId} from "../model/ModuleId";
import {IHeaders} from "typed-rest-client/Interfaces";
import {OcpiRegistrationParams} from "./util/ocpi.registration.params";
import {CredentialsResponse} from "../model/credentials.response";
import {PostCredentialsParams} from "./param/credentials/post.credentials.params";
import {PutCredentialsParams} from "./param/credentials/put.credentials.params";

export class CredentialsClientApi extends BaseClientApi {
  CONTROLLER_PATH = ModuleId.Credentials;

  async getCredentials(params: OcpiRegistrationParams): Promise<CredentialsResponse> {
    this.validateOcpiRegistrationParams(params);
    const additionalHeaders: IHeaders = this.getOcpiRegistrationHeaders(params);
    return await this.get<CredentialsResponse>({
      version: params.version,
      additionalHeaders,
    });
  }

  async postCredentials(params: PostCredentialsParams): Promise<CredentialsResponse> {
    this.validateOcpiRegistrationParams(params);
    this.validateRequiredParam(
      params,
      'credentials'
    );
    const additionalHeaders: IHeaders = this.getOcpiRegistrationHeaders(params);
    return await this.create<CredentialsResponse>({
      version: params.version,
      additionalHeaders,
    }, params.credentials);
  }

  async putCredentials(params: PutCredentialsParams): Promise<CredentialsResponse> {
    this.validateOcpiRegistrationParams(params);
    this.validateRequiredParam(
      params,
      'credentials'
    );
    const additionalHeaders: IHeaders = this.getOcpiRegistrationHeaders(params);
    return await this.update<CredentialsResponse>({
      version: params.version,
      additionalHeaders,
    }, params.credentials);
  }

  async deleteCredentials(params: PutCredentialsParams): Promise<CredentialsResponse> {
    this.validateOcpiRegistrationParams(params);
    const additionalHeaders: IHeaders = this.getOcpiRegistrationHeaders(params);
    return await this.del<CredentialsResponse>({
      version: params.version,
      additionalHeaders,
    });
  }
}
