import { BaseClientApi } from './BaseClientApi';
import { IHeaders } from 'typed-rest-client/Interfaces';
import { Service } from 'typedi';
import { UnsuccessfulRequestException } from '../exception/unsuccessful.request.exception';
import { IRestResponse } from 'typed-rest-client';
import { OcpiRegistrationParams } from './util/ocpi.registration.params';
import { VersionDetailsResponseDTO } from '../model/DTO/VersionDetailsResponseDTO';
import { VersionListResponseDTO } from '../model/DTO/VersionListResponseDTO';

@Service()
export class VersionsClientApi extends BaseClientApi {
  /**
   * This endpoint lists all the available OCPI versions and the corresponding URLs to where version specific details such as the supported endpoints can be found.
   */
  async getVersions(
    params: OcpiRegistrationParams,
  ): Promise<VersionListResponseDTO> {
    let response: IRestResponse<VersionListResponseDTO>;
    try {
      this.validateRequiredParam(params, 'authorization');
      const additionalHeaders: IHeaders =
        this.getOcpiRegistrationHeaders(params);
      response = await this.getRaw<VersionListResponseDTO>('/ocpi/versions', {
        additionalHeaders,
      });
      return this.handleResponse(response);
    } catch (e) {
      throw new UnsuccessfulRequestException(
        'Could not get version list',
        response!,
      );
    }
  }

  async getVersionDetails(
    params: OcpiRegistrationParams,
  ): Promise<VersionDetailsResponseDTO> {
    let response: IRestResponse<VersionDetailsResponseDTO>;
    try {
      this.validateRequiredParam(params, 'authorization');
      const additionalHeaders: IHeaders =
        this.getOcpiRegistrationHeaders(params);
      response = await this.getRaw<VersionDetailsResponseDTO>('', {
        // note URL set elsewhere
        additionalHeaders,
      });
      return this.handleResponse(response);
    } catch (e) {
      throw new UnsuccessfulRequestException(
        'Could not get version details',
        response!,
      );
    }
  }
}
