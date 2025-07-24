import { IRequestOptions, IRestResponse, RestClient } from 'typed-rest-client';
import { IHeaders, IRequestQueryParams } from 'typed-rest-client/Interfaces';
import { VersionNumber } from '../model/VersionNumber';
import { OcpiRegistrationParams } from './util/OcpiRegistrationParams';
import { OcpiParams } from './util/OcpiParams';
import { UnsuccessfulRequestException } from '../exception/UnsuccessfulRequestException';
import {
  HttpHeader,
  ITenantPartnerDto,
  OCPIRegistration,
} from '@citrineos/base';
import { OcpiHttpHeader } from '../util/OcpiHttpHeader';
import { base64Encode } from '../util/Util';
import { OcpiResponse } from '../model/OcpiResponse';
import { PaginatedResponse } from '../model/PaginatedResponse';
import { Constructable, Inject } from 'typedi';
import { v4 as uuidv4 } from 'uuid';
import { ModuleId } from '../model/ModuleId';
import { ILogObj, Logger } from 'tslog';
import { InterfaceRole } from '../model/InterfaceRole';
import { OcpiGraphqlClient } from '../graphql/OcpiGraphqlClient';
import {
  GetTenantPartnersByCpoAndModuleIdQuery,
  GetTenantPartnersByCpoClientAndModuleIdQuery,
} from '../graphql/types/graphql';
import {
  GET_TENANT_PARTNER_BY_CPO_AND_AND_CLIENT,
  LIST_TENANT_PARTNERS_BY_CPO,
} from '../graphql/queries/tenantPartner.queries';
import { PaginatedParams } from './param/PaginatedParams';

export interface RequiredOcpiParams {
  clientUrl: string;
  authToken: string;
  clientCountryCode: string;
  clientPartyId: string;
}

export class MissingRequiredParamException extends Error {
  override name = 'MissingRequiredParamException' as const;

  constructor(
    public field: string,
    msg?: string,
  ) {
    super(msg);
  }
}

export interface TriggerRequestOptions extends IRequestOptions {
  version?: VersionNumber;
  path?: string;
  async?: boolean;
}

export abstract class BaseClientApi {
  @Inject()
  protected logger!: Logger<ILogObj>;
  @Inject()
  protected ocpiGraphqlClient!: OcpiGraphqlClient;

  CONTROLLER_PATH = 'null';
  private restClient!: RestClient;

  constructor() {
    this.initRestClient();
  }

  abstract getUrl(partnerProfile: OCPIRegistration.PartnerProfile): string;

  protected getHeaders(
    partnerProfile: OCPIRegistration.PartnerProfile,
  ): IHeaders {
    const headers: IHeaders = {};
    headers[OcpiHttpHeader.XRequestId] = uuidv4();
    headers[OcpiHttpHeader.XCorrelationId] = uuidv4();
    const token = partnerProfile.serverCredentials.token;
    if (!token) {
      throw new MissingRequiredParamException(
        'token',
        `TenantPartner missing server token: ${JSON.stringify(partnerProfile)}`,
      );
    }
    headers[HttpHeader.Authorization] = `Token ${base64Encode(token)}`;
    return headers;
  }

  async request<T extends OcpiResponse<any>>(
    fromCountryCode: string,
    fromPartyId: string,
    toCountryCode: string,
    toPartyId: string,
    httpMethod: 'get' | 'post' | 'put' | 'patch' | 'delete',
    clazz: Constructable<T>,
    partnerProfile?: OCPIRegistration.PartnerProfile,
    routingHeaders = true,
    url?: string,
    body?: any,
    paginatedParams?: PaginatedParams,
    otherParams?: Record<string, string | number | (string | number)[]>,
  ): Promise<T> {
    if (!partnerProfile) {
      const partner = await this.ocpiGraphqlClient.request<ITenantPartnerDto>(
        GET_TENANT_PARTNER_BY_CPO_AND_AND_CLIENT,
        {
          cpoCountryCode: fromCountryCode,
          cpoPartyId: fromPartyId,
          clientCountryCode: toCountryCode,
          clientPartyId: toPartyId,
        },
      );
      partnerProfile = partner.partnerProfileOCPI!;
    }
    if (!url) {
      url = this.getUrl(partnerProfile);
    }
    const additionalHeaders = this.getHeaders(partnerProfile);
    if (routingHeaders) {
      additionalHeaders[OcpiHttpHeader.OcpiFromCountryCode] = fromCountryCode;
      additionalHeaders[OcpiHttpHeader.OcpiFromPartyId] = fromPartyId;
      additionalHeaders[OcpiHttpHeader.OcpiToCountryCode] = toCountryCode;
      additionalHeaders[OcpiHttpHeader.OcpiToPartyId] = toPartyId;
    }
    const options: IRequestOptions = { additionalHeaders };
    const queryParameters: IRequestQueryParams = {
      params: otherParams || {},
    };
    if (
      paginatedParams &&
      (paginatedParams.offset ||
        paginatedParams.limit ||
        paginatedParams.date_from ||
        paginatedParams.date_to)
    ) {
      if (paginatedParams.offset) {
        queryParameters.params['offset'] = paginatedParams.offset;
      }
      if (paginatedParams.limit) {
        queryParameters.params['limit'] = paginatedParams.limit;
      }
      if (paginatedParams.date_from) {
        queryParameters.params['date_from'] = new Date(
          paginatedParams.date_from,
        ).toISOString();
      }
      if (paginatedParams.date_to) {
        queryParameters.params['date_to'] = new Date(
          paginatedParams.date_to,
        ).toISOString();
      }
    }
    options.queryParameters = queryParameters;
    switch (httpMethod) {
      case 'get':
        return this.getRaw<T>(url, options).then((response) =>
          this.handleResponse(clazz, response),
        );
      case 'post':
        return this.createRaw<T>(url, body, options).then((response) =>
          this.handleResponse(clazz, response),
        );
      case 'put':
        return this.replaceRaw<T>(url, body, options).then((response) =>
          this.handleResponse(clazz, response),
        );
      case 'patch':
        return this.updateRaw<T>(url, body, options).then((response) =>
          this.handleResponse(clazz, response),
        );
      case 'delete':
        return this.delRaw<T>(url, options).then((response) =>
          this.handleResponse(clazz, response),
        );
    }
  }

  protected async getRaw<T>(
    url: string,
    options?: IRequestOptions,
  ): Promise<IRestResponse<T>> {
    return this.restClient.get<T>(url, options);
  }

  protected async delRaw<T>(
    url: string,
    options?: IRequestOptions,
  ): Promise<IRestResponse<T>> {
    return this.restClient.del<T>(url, options);
  }

  protected async createRaw<T>(
    url: string,
    body: any,
    options?: IRequestOptions,
  ): Promise<IRestResponse<T>> {
    return this.restClient.create<T>(url, body, options);
  }

  protected async updateRaw<T>(
    url: string,
    body: any,
    options?: IRequestOptions,
  ): Promise<IRestResponse<T>> {
    return this.restClient.update<T>(url, body, options);
  }

  protected async replaceRaw<T>(
    url: string,
    body: any,
    options?: IRequestOptions,
  ): Promise<IRestResponse<T>> {
    return this.restClient.replace<T>(url, body, options);
  }

  protected getOffsetFromLink(link: string): number {
    const url = new URL(link);
    const offset = url.searchParams.get('offset');
    if (offset) {
      return parseInt(offset, 10);
    }
    return 0;
  }

  public async broadcastToClients<T extends OcpiResponse<any>>(
    cpoCountryCode: string,
    cpoPartyId: string,
    moduleId: ModuleId,
    interfaceRole: InterfaceRole,
    httpMethod: 'get' | 'post' | 'put' | 'patch' | 'delete',
    clazz: Constructable<T>,
  ): Promise<T[]> {
    const responses: T[] = [];
    const partners = await this.ocpiGraphqlClient.request<ITenantPartnerDto[]>(
      LIST_TENANT_PARTNERS_BY_CPO,
      {
        cpoCountryCode,
        cpoPartyId,
        endpointIdentifier: `${moduleId}_${interfaceRole}`,
      },
    );
    for (const partner of partners) {
      const response = await this.request(
        cpoCountryCode,
        cpoPartyId,
        partner.countryCode!,
        partner.partyId!,
        httpMethod,
        clazz,
        partner.partnerProfileOCPI!,
      );
      responses.push(response);
    }
    return responses;
  }

  protected handleResponse<T>(
    clazz: Constructable<T>,
    response: IRestResponse<T>,
  ): T {
    if (response.statusCode >= 200 && response.statusCode <= 299) {
      if (
        Object.prototype.isPrototypeOf.call(
          PaginatedResponse.prototype,
          clazz.prototype,
        )
      ) {
        const headers: any = response.headers;
        const result = response.result as PaginatedResponse<any>;
        if (headers) {
          let link = headers[OcpiHttpHeader.Link.toLowerCase()];
          const xTotalCount = headers[OcpiHttpHeader.XTotalCount.toLowerCase()];
          const xLimit = headers[OcpiHttpHeader.XLimit.toLowerCase()];
          if (xLimit) {
            result.limit = parseInt(xLimit, 10);
          }
          if (xTotalCount) {
            result.total = parseInt(xTotalCount, 10);
          }
          if (link) {
            // Reference https://github.com/ocpi/ocpi/blob/d7d82b6524106e0454101d8cde472cd6f807d9c7/transport_and_format.asciidoc?plain=1#L181
            // Link: <url>; rel="next"
            link = link.substring(1, link.indexOf('>'));
            result.link = link;
            result.offset = this.getOffsetFromLink(link);
          }
        }
        return result as T;
      } else {
        return response.result as T;
      }
    } else {
      throw new UnsuccessfulRequestException(
        'Request did not return a successful status code',
        response,
      );
    }
  }

  private initRestClient() {
    this.restClient = new RestClient(`CitrineOS OCPI ${this.CONTROLLER_PATH}`);
  }
}
