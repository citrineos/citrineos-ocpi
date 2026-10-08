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
  ): Promise<PennylaneCompanyCustomerResponse> {
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
      // typed-rest-client rejects on non-2xx statuses (other than 404)
      const statusCode = (error as { statusCode?: number })?.statusCode;
      this.logger.error('TS API company customer request failed', {
        statusCode,
        message: (error as Error)?.message,
      });
      // On an HTTP status the message is the TS API body (its `detail`), which
      // tells the admin what to fix (VAT already used, partner already linked).
      throw new UnsuccessfulRequestException(
        `TS API company customer request failed${
          statusCode
            ? ` with status ${statusCode}: ${(error as Error)?.message}`
            : ''
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

    if (!response.result) {
      throw new UnsuccessfulRequestException(
        'TS API company customer response has no body',
        response,
      );
    }
    return response.result;
  }
}
