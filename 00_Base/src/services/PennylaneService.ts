// SPDX-FileCopyrightText: 2026 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0
import { Inject, Service } from 'typedi';
import { RestClient } from 'typed-rest-client';
import type { IRestResponse } from 'typed-rest-client';
import { OcpiLogger } from '../util/OcpiLogger.js';
import { OcpiConfigToken, type OcpiConfig } from '../config/ocpi.types.js';
import { UnsuccessfulRequestException } from '../exception/UnsuccessfulRequestException.js';

const COMPANY_CUSTOMERS_PATH = '/api/v1/pennylane/company_customers';

/**
 * Body of POST /api/v1/pennylane/company_customers on the TS API.
 * TODO: fill in the fields the TS API expects.
 */
export type PennylaneCompanyCustomerRequest = {
  name: string;
};

/**
 * Response of POST /api/v1/pennylane/company_customers.
 * TODO: type the fields the TS API returns (at least the customer id).
 */
export type PennylaneCompanyCustomerResponse = Record<string, unknown>;

@Service()
export class PennylaneService {
  constructor(
    private readonly logger: OcpiLogger,
    @Inject(OcpiConfigToken) private readonly config: OcpiConfig,
  ) {}

  /**
   * Creates a Pennylane company customer through the TS API.
   * `authorization` is the full Authorization header value (e.g. "Bearer ...").
   * TODO: decide where the token comes from; it is optional until then.
   */
  async createCompanyCustomer(
    payload: PennylaneCompanyCustomerRequest,
    authorization?: string,
  ): Promise<PennylaneCompanyCustomerResponse> {
    const baseUrl = this.config.tsApi?.url;
    if (!baseUrl) {
      throw new Error(
        'TS API is not configured (set TS_API_URL or CITRINEOS_OCPI_TSAPI_URL)',
      );
    }

    const client = new RestClient('CitrineOS OCPI TS API', baseUrl);
    let response: IRestResponse<PennylaneCompanyCustomerResponse>;
    try {
      response = await client.create<PennylaneCompanyCustomerResponse>(
        COMPANY_CUSTOMERS_PATH,
        payload,
        {
          additionalHeaders: {
            'Content-Type': 'application/json',
            ...(authorization ? { Authorization: authorization } : {}),
          },
        },
      );
    } catch (error) {
      // typed-rest-client rejects on non-2xx statuses (other than 404)
      const statusCode = (error as { statusCode?: number })?.statusCode;
      this.logger.error('TS API company customer request failed', {
        statusCode,
        message: (error as Error)?.message,
      });
      throw new UnsuccessfulRequestException(
        `TS API company customer request failed${
          statusCode ? ` with status ${statusCode}` : ''
        }`,
      );
    }

    if (response.statusCode < 200 || response.statusCode > 299) {
      this.logger.error('TS API company customer request failed', {
        statusCode: response.statusCode,
      });
      throw new UnsuccessfulRequestException(
        `TS API company customer request failed with status ${response.statusCode}`,
        response,
      );
    }

    return response.result ?? {};
  }
}
