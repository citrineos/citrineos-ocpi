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
 * `detail.code` of the TS API 409 returned when the
 * (tenant_partner_id, roaming_partner_id) pair is already linked to a customer.
 */
export const PENNYLANE_PARTNER_ALREADY_LINKED = 'ocpi_partner_already_linked';

/** Error body of the TS API (FastAPI): `detail` is a message or an object. */
type TsApiErrorBody = {
  detail?: string | { code?: string; [key: string]: unknown };
};

/** Body of POST /api/v1/pennylane/company_customers on the TS API. */
export type PennylaneCompanyCustomerRequest = {
  name: string;
  payment_conditions: string;
  emails: string[];
  billing_address: {
    address: string;
    postal_code: string;
    city: string;
    country_alpha2: string;
  };
  vat_number: string;
  reg_no: string;
  phone: string;
  recipient: string;
  billing_iban: string;
  notes: string;
  billing_language: string;
  reference?: string;
  external_reference?: string;
  // CitrineOS ids the TS API links the customer to; never sent on to Pennylane.
  tenant_partner_id?: number;
  roaming_partner_id?: number;
};

/** Response of POST /api/v1/pennylane/company_customers (subset). */
export type PennylaneCompanyCustomerResponse = {
  id: number;
  name: string;
  external_reference?: string | null;
  created_at?: string | null;
};

/** `created` is false when the TS API linked an existing Pennylane customer (200, not 201). */
export type PennylaneCompanyCustomerResult = {
  customer: PennylaneCompanyCustomerResponse;
  created: boolean;
};

@Service()
export class PennylaneService {
  constructor(
    private readonly logger: OcpiLogger,
    @Inject(OcpiConfigToken) private readonly config: OcpiConfig,
  ) {}

  /**
   * Creates a Pennylane company customer through the TS API, billed by the
   * configured billing entity.
   * `authorization` is the caller's Authorization header value ("Bearer ..."),
   * forwarded as is: the TS API accepts the same Keycloak realm.
   */
  async createCompanyCustomer(
    payload: PennylaneCompanyCustomerRequest,
    authorization?: string,
  ): Promise<PennylaneCompanyCustomerResult> {
    const baseUrl = this.config.tsApi?.url;
    if (!baseUrl) {
      throw new Error(
        'TS API is not configured (set CITRINEOS_OCPI_TSAPI_URL)',
      );
    }
    const billingEntity = this.config.tsApi?.billingEntity;
    if (!billingEntity) {
      throw new Error(
        'TS API billing entity is not configured (set CITRINEOS_OCPI_TSAPI_BILLINGENTITY)',
      );
    }

    const client = new RestClient('CitrineOS OCPI TS API', baseUrl);
    let response: IRestResponse<PennylaneCompanyCustomerResponse>;
    try {
      response = await client.create<PennylaneCompanyCustomerResponse>(
        `${COMPANY_CUSTOMERS_PATH}?billing_entity=${encodeURIComponent(billingEntity)}`,
        payload,
        {
          additionalHeaders: {
            'Content-Type': 'application/json',
            ...(authorization ? { Authorization: authorization } : {}),
          },
        },
      );
    } catch (error) {
      // typed-rest-client rejects on non-2xx statuses (other than 404), with
      // the status on `statusCode` and the parsed body on `result`.
      const { statusCode, result, message } = error as {
        statusCode?: number;
        result?: TsApiErrorBody;
        message?: string;
      };
      const detail = result?.detail;
      const code = typeof detail === 'object' ? detail?.code : undefined;
      this.logger.error('TS API company customer request failed', {
        statusCode,
        code,
        message,
      });
      // The TS API `detail` tells the admin what to fix (invalid VAT, ...).
      const reason =
        detail === undefined
          ? message
          : typeof detail === 'string'
            ? detail
            : JSON.stringify(detail);
      throw new UnsuccessfulRequestException(
        `TS API company customer request failed${
          statusCode ? ` with status ${statusCode}` : ''
        }: ${reason}`,
        undefined,
        { statusCode, code },
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

    if (!response.result) {
      throw new UnsuccessfulRequestException(
        'TS API company customer response has no body',
        response,
      );
    }
    return { customer: response.result, created: response.statusCode === 201 };
  }
}
