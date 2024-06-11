import {BaseClientApi} from './BaseClientApi';
import {OcpiResponse} from '@citrineos/ocpi-base/dist/model/ocpi.response';
import {VersionDTO} from '../../../00_Base/src/model/VersionDTO';
import {IHeaders} from 'typed-rest-client/Interfaces';
import {VersionNumber} from '@citrineos/ocpi-base/dist/model/VersionNumber';
import {VersionDetailsDTO} from "../../../00_Base/src/model/VersionDetailsDTO";
import {Service} from "typedi";

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
