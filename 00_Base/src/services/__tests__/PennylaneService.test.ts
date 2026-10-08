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

import { PennylaneService } from '../PennylaneService';
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
    expect(result).toEqual(created);
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
    ).rejects.toThrow('TS API company customer request failed with status 401');
    expect(logger.error).toHaveBeenCalled();
  });

  it('wraps a network error without a status code', async () => {
    create.mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(
      serviceWith(configured).createCompanyCustomer(payload),
    ).rejects.toThrow(UnsuccessfulRequestException);
  });
});
