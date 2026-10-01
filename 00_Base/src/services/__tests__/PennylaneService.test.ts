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
import { UnsuccessfulRequestException } from '../../exception/UnsuccessfulRequestException';

const payload = { name: 'ABC Mobility' };

describe('PennylaneService.createCompanyCustomer', () => {
  let logger: { error: jest.Mock; info: jest.Mock };

  const serviceWith = (tsApi?: { url: string }) =>
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

  it('posts the payload to /api/v1/pennylane/company_customers on the configured url', async () => {
    create.mockResolvedValue({ statusCode: 201, result: { id: 'cust_1' } });

    const result = await serviceWith({
      url: 'http://localhost:8080',
    }).createCompanyCustomer(payload);

    expect(restClientCtor).toHaveBeenCalledWith(
      expect.any(String),
      'http://localhost:8080',
    );
    expect(create).toHaveBeenCalledWith(
      '/api/v1/pennylane/company_customers',
      payload,
      { additionalHeaders: { 'Content-Type': 'application/json' } },
    );
    expect(result).toEqual({ id: 'cust_1' });
  });

  it('forwards the Authorization header when one is given', async () => {
    create.mockResolvedValue({ statusCode: 200, result: {} });

    await serviceWith({ url: 'http://localhost:8080' }).createCompanyCustomer(
      payload,
      'Bearer abc.def.ghi',
    );

    expect(create.mock.calls[0][2].additionalHeaders).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer abc.def.ghi',
    });
  });

  it('returns an empty object when the response has no body', async () => {
    create.mockResolvedValue({ statusCode: 204, result: null });

    await expect(
      serviceWith({ url: 'http://localhost:8080' }).createCompanyCustomer(
        payload,
      ),
    ).resolves.toEqual({});
  });

  it('throws UnsuccessfulRequestException on a non-2xx response', async () => {
    create.mockResolvedValue({ statusCode: 404, result: null });

    await expect(
      serviceWith({ url: 'http://localhost:8080' }).createCompanyCustomer(
        payload,
      ),
    ).rejects.toThrow(UnsuccessfulRequestException);
    expect(logger.error).toHaveBeenCalled();
  });

  it('wraps a rejected request and keeps the status code in the message', async () => {
    create.mockRejectedValue(
      Object.assign(new Error('Failed request: (401)'), { statusCode: 401 }),
    );

    await expect(
      serviceWith({ url: 'http://localhost:8080' }).createCompanyCustomer(
        payload,
      ),
    ).rejects.toThrow('TS API company customer request failed with status 401');
    expect(logger.error).toHaveBeenCalled();
  });

  it('wraps a network error without a status code', async () => {
    create.mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(
      serviceWith({ url: 'http://localhost:8080' }).createCompanyCustomer(
        payload,
      ),
    ).rejects.toThrow(UnsuccessfulRequestException);
  });
});
