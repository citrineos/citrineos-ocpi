import { GetCdrParams } from './param/cdrs/GetCdrParams';
import { PostCdrParams } from './param/cdrs/PostCdrParams';
import { IHeaders } from 'typed-rest-client/Interfaces';
import { ModuleId } from '../model/ModuleId';
import { NotFoundError } from 'routing-controllers';
import { BaseClientApi } from './BaseClientApi';
import { CdrResponse } from '../model/Cdr';
import { Service } from 'typedi';

interface PostCdrResponseHeaders {
  Location: string;
}

@Service()
export class CdrsClientApi extends BaseClientApi {
  CONTROLLER_PATH = ModuleId.Cdrs;

  async getCdr(params: GetCdrParams): Promise<CdrResponse> {
    this.validateOcpiParams(params);
    const additionalHeaders: IHeaders = this.getOcpiHeaders(params);
    return await this.get(CdrResponse, {
      version: params.version,
      additionalHeaders,
    });
  }

  async postCdr(params: PostCdrParams): Promise<string> {
    this.validateOcpiParams(params);
    this.validateRequiredParam(params, 'cdr');
    const additionalHeaders: IHeaders = this.getOcpiHeaders(params);
    const response = await this.createRaw<void>('', params.cdr, {
      additionalHeaders,
    });
    const headers = response.headers as PostCdrResponseHeaders;
    const cdrLocationUrl = headers.Location;
    if (!cdrLocationUrl) {
      throw new NotFoundError('No Location header in OCPI response');
    }
    return cdrLocationUrl;
  }
}
