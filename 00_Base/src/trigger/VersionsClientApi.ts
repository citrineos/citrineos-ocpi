import {BaseClientApi} from './BaseClientApi';
import {IHeaders} from 'typed-rest-client/Interfaces';
import {Service} from "typedi";
import {VersionNumber} from "../model/VersionNumber";
import {OcpiResponse} from "../model/ocpi.response";
import {VersionDetailsDTO} from "../model/DTO/VersionDetailsDTO";
import {VersionDTO} from "../model/DTO/VersionDTO";

export interface GetVersionRequest {
  authorization: string;
  version: VersionNumber;
}

export interface GetVersionsRequest {
  authorization: string;
  version: VersionNumber;
}

@Service()
export class VersionsClientApi extends BaseClientApi {
  async getVersion(
    requestParameters: GetVersionRequest,
  ): Promise<OcpiResponse<VersionDetailsDTO>> {
    this.validateRequiredParam(requestParameters, 'authorization');
    const additionalHeaders: IHeaders = {};
    this.setAuthHeader(additionalHeaders, requestParameters.authorization);
    return await this.get<OcpiResponse<VersionDetailsDTO>>({
      version: requestParameters.version,
      additionalHeaders,
    });
  }

  /**
   * This endpoint lists all the available OCPI versions and the corresponding URLs to where version specific details such as the supported endpoints can be found.
   */
  async getVersions(
    requestParameters: GetVersionsRequest,
  ): Promise<OcpiResponse<VersionDTO[]>> {
    this.validateRequiredParam(requestParameters, 'authorization');
    const additionalHeaders: IHeaders = {};
    this.setAuthHeader(additionalHeaders, requestParameters.authorization);
    return await this.getRaw<OcpiResponse<VersionDTO[]>>(this.getPath(requestParameters.version, '/ocpi/versions'), {
      additionalHeaders,
    }).then((response) => this.handleResponse(response));
  }
}
