import {IRequestOptions, IRestResponse, RestClient} from 'typed-rest-client';
import {IHeaders, IRequestQueryParams} from 'typed-rest-client/Interfaces';
import {OcpiRegistrationParams} from './util/ocpi.registration.params';
import {OcpiParams} from './util/ocpi.params';
import {UnsuccessfulRequestException} from '../exception/UnsuccessfulRequestException';
import {HttpHeader} from '@citrineos/base';
import {OcpiHttpHeader} from '../util/ocpi.http.header';
import {base64Encode} from '../util/util';
import {VersionNumber} from '../model/VersionNumber';

export class MissingRequiredParamException extends Error {
  override name = 'MissingRequiredParamException' as const;

  constructor(
    public field: string,
    msg?: string,
  ) {
    super(msg);
  }
}

export class BaseClientApi {
  CONTROLLER_PATH = 'null';
  private _baseUrl = 'http://localhost:3000';
  private restClient!: RestClient;

  constructor() {
    this.initRestClient();
  }

  get baseUrl(): string {
    return this._baseUrl;
  }

  set baseUrl(value: string) {
    this._baseUrl = value;
    this.initRestClient();
  }

  async optionsRaw<T>(
    url: string,
    options?: IRequestOptions,
  ): Promise<IRestResponse<T>> {
    return this.restClient.options<T>(url, options);
  }

  async options<T>(url: string, options: IRequestOptions): Promise<T> {
    try {
      const response = await this.optionsRaw<T>(url, options);
      return this.handleResponse<T>(response);
    } catch (e: any) {
      return this.handleError<T>(e);
    }
  }

  async getRaw<T>(
    url: string,
    options?: IRequestOptions,
  ): Promise<IRestResponse<T>> {
    return this.restClient.get<T>(url, options);
  }

  async get<T>(options: IRequestOptions, url = ''): Promise<T> {
    try {
      const response = await this.getRaw<T>(url, options);
      return this.handleResponse<T>(response);
    } catch (e: any) {
      return this.handleError<T>(e);
    }
  }

  async delRaw<T>(
    url: string,
    options?: IRequestOptions,
  ): Promise<IRestResponse<T>> {
    return this.restClient.del<T>(url, options);
  }

  async del<T>(options: IRequestOptions, url = ''): Promise<T> {
    try {
      const response = await this.delRaw<T>(url, options);
      return this.handleResponse<T>(response);
    } catch (e: any) {
      return this.handleError<T>(e);
    }
  }

  async createRaw<T>(
    url: string,
    body: any,
    options?: IRequestOptions,
  ): Promise<IRestResponse<T>> {
    return this.restClient.create<T>(url, body, options);
  }

  async create<T>(options: IRequestOptions, body: any, url = ''): Promise<T> {
    try {
      const response = await this.createRaw<T>(url, body, options);
      return this.handleResponse<T>(response);
    } catch (e: any) {
      return this.handleError<T>(e);
    }
  }

  async updateRaw<T>(
    url: string,
    body: any,
    options?: IRequestOptions,
  ): Promise<IRestResponse<T>> {
    return this.restClient.update<T>(url, body, options);
  }

  async update<T>(options: IRequestOptions, body: any, url = ''): Promise<T> {
    try {
      const response = await this.updateRaw<T>(url, body, options);
      return this.handleResponse<T>(response);
    } catch (e: any) {
      return this.handleError<T>(e);
    }
  }

  async replaceRaw<T>(
    url: string,
    body: any,
    options?: IRequestOptions,
  ): Promise<IRestResponse<T>> {
    return this.restClient.replace<T>(url, body, options);
  }

  async replace<T>(options: IRequestOptions, body: any, url = ''): Promise<T> {
    try {
      const response = await this.replaceRaw<T>(url, body, options);
      return this.handleResponse<T>(response);
    } catch (e: any) {
      return this.handleError<T>(e);
    }
  }

  validateRequiredParam(params: any, ...paramNameList: string[]) {
    for (let i = 0; i < paramNameList.length; i++) {
      const paramName = paramNameList[i];
      if (!(params as any)[paramName]) {
        throw new MissingRequiredParamException(
          paramName,
          this.getRequiredParametersErrorMsgString(paramName),
        );
      }
    }
  }

  validateOcpiRegistrationParams(params: OcpiRegistrationParams) {
    if (
      !params.authorization ||
      !params.authorization.length ||
      params.authorization.length === 0
    ) {
      throw new MissingRequiredParamException(
        params.authorization,
        'Required parameter authorization must be present',
      );
    }
    if (!params.version) {
      throw new MissingRequiredParamException(
        params.version!,
        'Required parameter version must be present',
      );
    }
  }

  validateOcpiParams<T extends OcpiParams>(params: T) {
    this.validateOcpiRegistrationParams(params);
    if (
      !params.fromCountryCode ||
      !params.fromCountryCode.length ||
      params.fromCountryCode.length !== 2
    ) {
      throw new MissingRequiredParamException(
        params.fromCountryCode,
        'Required parameter fromCountryCode must be a 2 character string',
      );
    }
    if (
      !params.toCountryCode ||
      !params.toCountryCode.length ||
      params.toCountryCode.length !== 2
    ) {
      throw new MissingRequiredParamException(
        params.toCountryCode,
        'Required parameter toCountryCode must be a 2 character string',
      );
    }
    if (
      !params.fromPartyId ||
      !params.fromPartyId.length ||
      params.fromPartyId.length !== 3
    ) {
      throw new MissingRequiredParamException(
        params.fromPartyId,
        'Required parameter fromPartyId must be a 3 character string',
      );
    }
    if (
      !params.toPartyId ||
      !params.toPartyId.length ||
      params.toPartyId.length !== 3
    ) {
      throw new MissingRequiredParamException(
        params.toPartyId,
        'Required parameter toPartyId must be a 3 character string',
      );
    }
  }

  getRequiredParametersErrorMsgString(...params: string[]): string {
    return `Required parameters [${params.join(',')}] are null or undefined`;
  }

  protected getPathForVersion(version = VersionNumber.TWO_DOT_TWO_DOT_ONE) {
    return `/ocpi/${version}/${this.CONTROLLER_PATH}`;
  }

  protected getBasePath(params: OcpiParams) {
    return this.getPathForVersion(params.version);
  }

  protected getPath(version = VersionNumber.TWO_DOT_TWO_DOT_ONE, path: string = '') {
    return `${this.getPathForVersion(version)}/${path}`;
  }

  protected newQueryParams(): IRequestQueryParams {
    return {
      options: {},
      params: {},
    };
  }

  protected handleError<T>(error: Error): Promise<T> {
    const msg = `Rest client error: ${error.message}`;
    console.error(msg);
    return Promise.reject(new UnsuccessfulRequestException(msg));
  }

  protected handleResponse<T>(response: IRestResponse<T>): T {
    if (response.statusCode >= 200 && response.statusCode <= 299) {
      return response.result as T;
    } else {
      throw new UnsuccessfulRequestException(
        'Request did not return a successful status code',
        response,
      );
    }
  }

  protected setAuthHeader = (headerParameters: IHeaders, token: string) => {
    if (token && headerParameters) {
      headerParameters[HttpHeader.Authorization] =
        `Token ${base64Encode(token)}`;
    }
  };

  protected getOcpiRegistrationHeaders = (
    params: OcpiRegistrationParams,
  ): IHeaders => {
    const headerParameters: IHeaders = {};
    headerParameters[OcpiHttpHeader.XRequestId] =
      params.xRequestId != null ? String(params.xRequestId) : 'placeholder';
    headerParameters[OcpiHttpHeader.XCorrelationId] =
      params.xCorrelationId != null
        ? String(params.xCorrelationId)
        : 'placeholder';
    this.setAuthHeader(headerParameters, params.authorization);
    return headerParameters;
  };

  protected getOcpiHeaders = (params: OcpiParams): IHeaders => {
    const headerParameters: IHeaders = this.getOcpiRegistrationHeaders(params);

    if (params.fromCountryCode != null) {
      headerParameters[OcpiHttpHeader.OcpiFromCountryCode] = String(
        params.fromCountryCode,
      );
    }

    if (params.fromPartyId != null) {
      headerParameters[OcpiHttpHeader.OcpiFromPartyId] = String(
        params.fromPartyId,
      );
    }

    if (params.toCountryCode != null) {
      headerParameters[OcpiHttpHeader.OcpiToCountryCode] = String(
        params.toCountryCode,
      );
    }

    if (params.toPartyId != null) {
      headerParameters[OcpiHttpHeader.OcpiToPartyId] = String(params.toPartyId);
    }

    return headerParameters;
  };

  private initRestClient() {
    this.restClient = new RestClient(
      `CitrineOS OCPI ${this.CONTROLLER_PATH}`,
      this.baseUrl,
    );
  }
}
