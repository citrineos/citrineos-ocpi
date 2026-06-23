// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import type { IRequestOptions, IRestResponse } from 'typed-rest-client';
import { RestClient } from 'typed-rest-client';
import type {
  IHeaders,
  IRequestQueryParams,
} from 'typed-rest-client/Interfaces.js';
import { VersionNumber } from '../model/VersionNumber.js';
import { UnsuccessfulRequestException } from '../exception/UnsuccessfulRequestException.js';
import type { PartnerProfile } from '@zetra/citrineos-base';
import { HttpHeader, HttpMethod } from '@zetra/citrineos-base';
import { OcpiHttpHeader } from '../util/OcpiHttpHeader.js';
import { base64Encode } from '../util/Util.js';
import { Inject } from 'typedi';
import { v4 as uuidv4 } from 'uuid';
import { ModuleId } from '../model/ModuleId.js';
import type { ILogObj } from 'tslog';
import { Logger } from 'tslog';
import { InterfaceRole } from '../model/InterfaceRole.js';
import type {
  GetTenantPartnerByCpoClientAndModuleIdQueryResult,
  GetTenantPartnerByCpoClientAndModuleIdQueryVariables,
  TenantPartnersListQueryResult,
  TenantPartnersListQueryVariables,
} from '../graphql/index.js';
import {
  GET_TENANT_PARTNER_BY_OUR_AND_PARTNER_IDENTITY,
  LIST_TENANT_PARTNERS_BY_CPO,
  OcpiGraphqlClient,
} from '../graphql/index.js';
import type { PaginatedParams } from './param/PaginatedParams.js';
import type { ZodTypeAny } from 'zod';
import { PartnerMtlsCertificateService } from '../util/PartnerMtlsCertificateService.js';
import {
  handleHttpMethodForPartner,
  shouldBroadcastToPartner,
} from '../util/helpers.js';

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

export interface BroadcastParams<T extends ZodTypeAny> {
  cpoCountryCode: string;
  cpoPartyId: string;
  moduleId: ModuleId;
  interfaceRole: InterfaceRole;
  httpMethod: HttpMethod;
  schema: T;
  routingHeaders?: boolean;
  url?: string;
  body?: any;
  paginatedParams?: PaginatedParams;
  otherParams?: Record<string, string | number | (string | number)[]>;
  path?: string;
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
  @Inject()
  protected partnerMtlsCertificateService!: PartnerMtlsCertificateService;

  CONTROLLER_PATH = 'null';
  private restClient!: RestClient;

  constructor() {
    this.initRestClient();
  }

  abstract getUrl(partnerProfile: PartnerProfile): string;

  protected getHeaders(partnerProfile: PartnerProfile): IHeaders {
    const headers: IHeaders = {};
    headers[OcpiHttpHeader.XRequestId] = uuidv4();
    headers[OcpiHttpHeader.XCorrelationId] = uuidv4();
    const token = partnerProfile.credentials?.token;
    if (!token) {
      throw new MissingRequiredParamException(
        'token',
        `TenantPartner missing server token: ${JSON.stringify(partnerProfile)}`,
      );
    }
    headers[HttpHeader.Authorization] = `Token ${base64Encode(token)}`;
    return headers;
  }

  async request<T extends ZodTypeAny>(
    fromCountryCode: string,
    fromPartyId: string,
    toCountryCode: string,
    toPartyId: string,
    httpMethod: HttpMethod,
    schema: T,
    partnerProfile?: PartnerProfile,
    routingHeaders = true,
    url?: string,
    body?: any,
    paginatedParams?: PaginatedParams,
    otherParams?: Record<string, string | number | (string | number)[]>,
    path?: string,
    awsSecretCertificateArn?: string | null,
    roamingPartnerCountryCode?: string | null,
    roamingPartnerPartyId?: string | null,
  ): Promise<any> {
    if (!partnerProfile) {
      const response = await this.ocpiGraphqlClient.request<
        GetTenantPartnerByCpoClientAndModuleIdQueryResult,
        GetTenantPartnerByCpoClientAndModuleIdQueryVariables
      >(GET_TENANT_PARTNER_BY_OUR_AND_PARTNER_IDENTITY, {
        ourCountryCode: fromCountryCode,
        ourPartyId: fromPartyId,
        partnerCountryCode: toCountryCode,
        partnerPartyId: toPartyId,
      });
      const partner = response.TenantPartners[0];
      partnerProfile = partner.partnerProfileOCPI!;
      if (awsSecretCertificateArn === undefined) {
        awsSecretCertificateArn = partner.awsSecretCertificateArn;
      }
    }
    if (!partnerProfile) {
      throw new MissingRequiredParamException(
        'partnerProfile',
        'Tenant partner or partnerProfileOCPI not found',
      );
    }
    if (!url) {
      url = this.getUrl(partnerProfile);
    }
    if (path) {
      url += path;
    }
    const additionalHeaders = this.getHeaders(partnerProfile);
    if (routingHeaders) {
      additionalHeaders[OcpiHttpHeader.OcpiFromCountryCode] = fromCountryCode;
      additionalHeaders[OcpiHttpHeader.OcpiFromPartyId] = fromPartyId;
      if (roamingPartnerCountryCode && roamingPartnerPartyId) {
        additionalHeaders[OcpiHttpHeader.OcpiToCountryCode] =
          roamingPartnerCountryCode;
        additionalHeaders[OcpiHttpHeader.OcpiToPartyId] = roamingPartnerPartyId;
      } else {
        additionalHeaders[OcpiHttpHeader.OcpiToCountryCode] = toCountryCode;
        additionalHeaders[OcpiHttpHeader.OcpiToPartyId] = toPartyId;
      }
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
    // typed-rest-client only applies queryParameters on GET/DELETE, not PUT/PATCH/POST
    if (
      httpMethod !== HttpMethod.Get &&
      httpMethod !== HttpMethod.Delete &&
      Object.keys(queryParameters.params).length > 0
    ) {
      const search = new URLSearchParams(
        Object.fromEntries(
          Object.entries(queryParameters.params).map(([k, v]) => [
            k,
            Array.isArray(v) ? v.join(',') : String(v),
          ]),
        ),
      ).toString();
      url += (url.includes('?') ? '&' : '?') + search;
    }
    const restClient = awsSecretCertificateArn?.trim()
      ? await this.partnerMtlsCertificateService.getRestClient(
          awsSecretCertificateArn,
          `CitrineOS OCPI ${this.CONTROLLER_PATH}`,
        )
      : this.restClient;

    switch (httpMethod) {
      case HttpMethod.Get:
        this.logger.debug(`Sending GET request to ${url}`);
        return this.getRaw<T>(url, options, restClient).then((response) =>
          this.handleResponse(schema, response),
        );
      case HttpMethod.Post:
        this.logger.debug(`Sending POST request to ${url}`);
        return this.createRaw<T>(url, body, options, restClient).then(
          (response) => this.handleResponse(schema, response),
        );
      case HttpMethod.Put:
        this.logger.debug(`Sending PUT request to ${url}`);
        return this.replaceRaw<T>(url, body, options, restClient).then(
          (response) => this.handleResponse(schema, response),
        );
      case HttpMethod.Patch:
        this.logger.debug(`Sending PATCH request to ${url}`);
        return this.updateRaw<T>(url, body, options, restClient).then(
          (response) => this.handleResponse(schema, response),
        );
      case HttpMethod.Delete:
        this.logger.debug(`Sending DELETE request to ${url}`);
        return this.delRaw<T>(url, options, restClient).then((response) =>
          this.handleResponse(schema, response),
        );
    }
  }

  protected async getRaw<T>(
    url: string,
    options?: IRequestOptions,
    restClient: RestClient = this.restClient,
  ): Promise<IRestResponse<T>> {
    return restClient.get<T>(url, options);
  }

  protected async delRaw<T>(
    url: string,
    options?: IRequestOptions,
    restClient: RestClient = this.restClient,
  ): Promise<IRestResponse<T>> {
    return restClient.del<T>(url, options);
  }

  protected async createRaw<T>(
    url: string,
    body: any,
    options?: IRequestOptions,
    restClient: RestClient = this.restClient,
  ): Promise<IRestResponse<T>> {
    return restClient.create<T>(url, body, options);
  }

  protected async updateRaw<T>(
    url: string,
    body: any,
    options?: IRequestOptions,
    restClient: RestClient = this.restClient,
  ): Promise<IRestResponse<T>> {
    return restClient.update<T>(url, body, options);
  }

  protected async replaceRaw<T>(
    url: string,
    body: any,
    options?: IRequestOptions,
    restClient: RestClient = this.restClient,
  ): Promise<IRestResponse<T>> {
    return restClient.replace<T>(url, body, options);
  }

  protected getOffsetFromLink(link: string): number {
    try {
      const url = new URL(link);
      const offset = url.searchParams.get('offset');
      if (offset) {
        return parseInt(offset, 10);
      }
    } catch {
      const match = link.match(/[?&]offset=(\d+)/);
      if (match) {
        return parseInt(match[1], 10);
      }
    }
    return 0;
  }

  public async broadcastToClients<T extends ZodTypeAny>(
    params: BroadcastParams<T>,
  ): Promise<T[]> {
    const {
      cpoCountryCode,
      cpoPartyId,
      moduleId,
      interfaceRole,
      httpMethod,
      schema,
      routingHeaders = true,
      url,
      body,
      paginatedParams,
      otherParams,
      path,
    } = params;
    this.logger.debug(
      `Broadcasting to clients for ${moduleId}_${interfaceRole}`,
    );
    this.logger.debug(
      `Requesting partners for ${cpoCountryCode}_${cpoPartyId}`,
    );
    this.logger.debug(`Using URL: ${url} with path ${path}`);
    const responses: T[] = [];
    const response = await this.ocpiGraphqlClient.request<
      TenantPartnersListQueryResult,
      TenantPartnersListQueryVariables
    >(LIST_TENANT_PARTNERS_BY_CPO, {
      cpoCountryCode,
      cpoPartyId,
      endpointIdentifier: `${moduleId}_${interfaceRole}`,
    });
    const partners = response.TenantPartners;
    for (const partner of partners) {
      if (!shouldBroadcastToPartner(partner, moduleId, this.logger)) {
        continue;
      }
      const HttpMethodForPartner = handleHttpMethodForPartner(
        httpMethod,
        moduleId,
        partner,
      );

      this.logger.debug(
        `Requesting partner ${partner.countryCode}_${partner.partyId}`,
      );
      try {
        const response = await this.request(
          cpoCountryCode,
          cpoPartyId,
          partner.countryCode!,
          partner.partyId!,
          HttpMethodForPartner,
          schema,
          partner.partnerProfileOCPI!,
          routingHeaders,
          url,
          body,
          paginatedParams,
          otherParams,
          path,
          partner.awsSecretCertificateArn ?? undefined,
        );
        responses.push(response);
      } catch (e) {
        this.logger.error(
          `request failed for ${partner.countryCode}/${partner.partyId}`,
          e,
        );
      }
    }
    return responses;
  }

  protected handleResponse<T extends ZodTypeAny>(
    schema: T,
    response: IRestResponse<unknown>,
  ): T {
    if (response.statusCode >= 200 && response.statusCode <= 299) {
      const result = response.result;

      // Check if this is a paginated response by checking expected shape or keys
      const isPaginated =
        result &&
        typeof result === 'object' &&
        'data' in result &&
        Array.isArray((result as any).data);

      if (isPaginated && response.headers) {
        const headers: any = response.headers;

        const link = headers[OcpiHttpHeader.Link.toLowerCase()];
        const xTotalCount = headers[OcpiHttpHeader.XTotalCount.toLowerCase()];
        const xLimit = headers[OcpiHttpHeader.XLimit.toLowerCase()];

        if (xLimit) {
          (result as any).limit = parseInt(xLimit, 10);
        }
        if (xTotalCount) {
          (result as any).total = parseInt(xTotalCount, 10);
        }
        if (link) {
          // Reference https://github.com/ocpi/ocpi/blob/d7d82b6524106e0454101d8cde472cd6f807d9c7/transport_and_format.asciidoc?plain=1#L181
          // Link: <url>; rel="next"
          const cleanedLink = link.substring(1, link.indexOf('>'));
          (result as any).link = cleanedLink;
          (result as any).offset = this.getOffsetFromLink(cleanedLink);
        }
      }
      // Parse and validate using Zod
      return schema.parse(result);
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
