import {BaseApi} from './BaseApi';
import {setAuthHeader} from './util';
import {OcpiResponse} from '../model/ocpi.response';
import {VersionDetailsDTO, VersionDTO} from '../model/Version';
import {IHeaders} from 'typed-rest-client/Interfaces';
import {VersionNumber} from '../model/VersionNumber';

export interface GetVersionRequest {
  authorization: string;
  version: VersionNumber;
}

export interface GetVersionsRequest {
  authorization: string;
}

export class VersionsControllerApi extends BaseApi {
  async getVersion(
    requestParameters: GetVersionRequest,
  ): Promise<OcpiResponse<VersionDetailsDTO>> {
    this.validateRequiredParam(requestParameters, 'authorization');
    const additionalHeaders: IHeaders = {};
    setAuthHeader(additionalHeaders);
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
    setAuthHeader(additionalHeaders);
    return await this.getRaw<OcpiResponse<VersionDTO[]>>('/ocpi/versions', {
      additionalHeaders
    }).then((response) => this.handleResponse(response));
  }
}
