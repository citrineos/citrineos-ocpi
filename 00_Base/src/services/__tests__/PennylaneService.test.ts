// SPDX-FileCopyrightText: 2026 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

const create = jest.fn();
const restClientCtor = jest.fn();
jest.mock('typed-rest-client', () => ({
  RestClient: jest.fn().mockImplementation((...args: unknown[]) => {
    restClientCtor(...args);
    return { create };
  }),
}));

import {
  PENNYLANE_PARTNER_ALREADY_LINKED,
  PennylaneService,
} from '../PennylaneService';
import type { PennylaneCompanyCustomerRequest } from '../PennylaneService';
import { UnsuccessfulRequestException } from '../../exception/UnsuccessfulRequestException';

const payload: PennylaneCompanyCustomerRequest = {
  name: 'ABC Mobility',
  payment_conditions: '30_days',
  emails: ['compta@abc-mobility.example'],
  billing_address: {
    address: '12 rue de la Gare',
    postal_code: '21190',
    city: 'Meursault',
    country_alpha2: 'FR',
  },
  vat_number: 'FR12345678901',
  reg_no: '123456789',
  phone: '+33380000000',
  recipient: 'Service comptabilite',
  billing_iban: 'FR7630006000011234567890189',
  notes: 'Created from Patterm',
  billing_language: 'fr_FR',
};

describe('PennylaneService.createCompanyCustomer', () => {
  let logger: { error: jest.Mock; info: jest.Mock };

  const configured = {
    url: 'http://localhost:8080',
    billingEntity: 'zetra_distribution',
  };

  const serviceWith = (tsApi?: { url: string; billingEntity?: string }) =>
    new PennylaneService(logger as any, { tsApi } as any);

  beforeEach(() => {
    create.mockReset();
    restClientCtor.mockClear();
    logger = { error: jest.fn(), info: jest.fn() };
  });

  it('throws a clear error when the TS API url is not configured', async () => {
    await expect(
      serviceWith(undefined).createCompanyCustomer(payload),
    ).rejects.toThrow(/TS API is not configured/);
    expect(create).not.toHaveBeenCalled();
  });

  it('throws a clear error when the billing entity is not configured', async () => {
    await expect(
      serviceWith({ url: 'http://localhost:8080' }).createCompanyCustomer(
        payload,
      ),
    ).rejects.toThrow(/billing entity is not configured/);
    expect(create).not.toHaveBeenCalled();
  });

  it('posts the payload to /api/v1/pennylane/company_customers for the configured billing entity', async () => {
    const created = { id: 42, name: 'ABC Mobility' };
    create.mockResolvedValue({ statusCode: 201, result: created });

    const result = await serviceWith(configured).createCompanyCustomer(payload);

    expect(restClientCtor).toHaveBeenCalledWith(
      expect.any(String),
      'http://localhost:8080',
    );
    expect(create).toHaveBeenCalledWith(
      '/api/v1/pennylane/company_customers?billing_entity=zetra_distribution',
      payload,
      { additionalHeaders: { 'Content-Type': 'application/json' } },
    );
    expect(result).toEqual({ customer: created, created: true });
  });

  it('reports created false when the TS API linked an existing customer (200)', async () => {
    const existing = { id: 42, name: 'ABC Mobility' };
    create.mockResolvedValue({ statusCode: 200, result: existing });

    await expect(
      serviceWith(configured).createCompanyCustomer(payload),
    ).resolves.toEqual({ customer: existing, created: false });
  });

  it('forwards the Authorization header when one is given', async () => {
    create.mockResolvedValue({
      statusCode: 201,
      result: { id: 42, name: 'ABC Mobility' },
    });

    await serviceWith(configured).createCompanyCustomer(
      payload,
      'Bearer abc.def.ghi',
    );

    expect(create.mock.calls[0][2].additionalHeaders).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer abc.def.ghi',
    });
  });

  it('throws UnsuccessfulRequestException when the response has no body', async () => {
    create.mockResolvedValue({ statusCode: 204, result: null });

    await expect(
      serviceWith(configured).createCompanyCustomer(payload),
    ).rejects.toThrow('TS API company customer response has no body');
  });

  it('throws UnsuccessfulRequestException on a non-2xx response', async () => {
    create.mockResolvedValue({ statusCode: 404, result: null });

    await expect(
      serviceWith(configured).createCompanyCustomer(payload),
    ).rejects.toThrow(UnsuccessfulRequestException);
    expect(logger.error).toHaveBeenCalled();
  });

  it('wraps a rejected request and keeps the status code in the message', async () => {
    create.mockRejectedValue(
      Object.assign(new Error('Failed request: (401)'), { statusCode: 401 }),
    );

    await expect(
      serviceWith(configured).createCompanyCustomer(payload),
    ).rejects.toThrow(
      'TS API company customer request failed with status 401: Failed request: (401)',
    );
    expect(logger.error).toHaveBeenCalled();
  });

  it('puts a string TS API detail in the message and keeps the status code', async () => {
    create.mockRejectedValue(
      Object.assign(new Error('{"detail":"Invalid VAT number"}'), {
        statusCode: 422,
        result: { detail: 'Invalid VAT number' },
      }),
    );

    const error = await serviceWith(configured)
      .createCompanyCustomer(payload)
      .catch((e) => e);

    expect(error).toBeInstanceOf(UnsuccessfulRequestException);
    expect(error.message).toBe(
      'TS API company customer request failed with status 422: Invalid VAT number',
    );
    expect(error.statusCode).toBe(422);
    expect(error.code).toBeUndefined();
  });

  it('keeps the status code and detail.code of a TS API 409', async () => {
    const detail = {
      code: PENNYLANE_PARTNER_ALREADY_LINKED,
      tenant_partner_id: 2,
      roaming_partner_id: 1,
    };
    create.mockRejectedValue(
      Object.assign(new Error(JSON.stringify({ detail })), {
        statusCode: 409,
        result: { detail },
      }),
    );

    const error = await serviceWith(configured)
      .createCompanyCustomer(payload)
      .catch((e) => e);

    expect(error).toBeInstanceOf(UnsuccessfulRequestException);
    expect(error.statusCode).toBe(409);
    expect(error.code).toBe('ocpi_partner_already_linked');
    expect(error.message).toBe(
      `TS API company customer request failed with status 409: ${JSON.stringify(detail)}`,
    );
  });

  it('wraps a network error without a status code', async () => {
    create.mockRejectedValue(new Error('ECONNREFUSED'));

    const error = await serviceWith(configured)
      .createCompanyCustomer(payload)
      .catch((e) => e);

    expect(error).toBeInstanceOf(UnsuccessfulRequestException);
    expect(error.message).toBe(
      'TS API company customer request failed: ECONNREFUSED',
    );
    expect(error.statusCode).toBeUndefined();
  });
});
