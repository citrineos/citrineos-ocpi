// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { ModuleId } from '../../model/ModuleId.js';
import { InterfaceRole } from '../../model/InterfaceRole.js';
import { OcpiEmptyResponseSchema } from '../../model/OcpiEmptyResponse.js';

jest.mock('@zetra/citrineos-base', () => ({
  HttpMethod: {
    Get: 'GET',
    Post: 'POST',
    Put: 'PUT',
    Patch: 'PATCH',
    Delete: 'DELETE',
  },
  HttpHeader: { Authorization: 'Authorization' },
}));

jest.mock('../../util/helpers.js', () => ({
  shouldBroadcastToPartner: jest.fn().mockReturnValue(true),
  handleHttpMethodForPartner: jest.fn((httpMethod: unknown) => httpMethod),
  isGirevePartner: jest.fn().mockReturnValue(false),
}));

describe('BaseClientApi.broadcastToClients — happy path', () => {
  it('calls request() once per eligible partner with the right args, and returns their responses', async () => {
    const { BaseClientApi } = require('../BaseClientApi');
    const { HttpMethod } = require('@zetra/citrineos-base');

    const mockLogger = {
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    const partnerA = {
      id: 1,
      countryCode: 'FR',
      partyId: 'CPO',
      partnerProfileOCPI: { credentials: { token: 'tokenA' } },
    };
    const partnerB = {
      id: 2,
      countryCode: 'DE',
      partyId: 'EVP',
      partnerProfileOCPI: { credentials: { token: 'tokenB' } },
    };

    const mockOcpiGraphqlClient = {
      request: jest
        .fn()
        .mockResolvedValue({ TenantPartners: [partnerA, partnerB] }),
    };

    const requestSpy = jest.fn().mockResolvedValue({ status_code: 1000 });

    class SucceedingClientApi extends BaseClientApi {
      getUrl(): string {
        return 'https://partner.example.com';
      }
      async request(...args: unknown[]): Promise<any> {
        return requestSpy(...args);
      }
    }

    const api = new SucceedingClientApi() as any;
    api.logger = mockLogger;
    api.ocpiGraphqlClient = mockOcpiGraphqlClient;
    api.partnerMtlsCertificateService = {};
    api.gireveBroadcastRetryOutbox = { upsertOnFailure: jest.fn() };

    const responses = await api.broadcastToClients({
      cpoCountryCode: 'FR',
      cpoPartyId: 'ZET',
      moduleId: ModuleId.Sessions,
      interfaceRole: InterfaceRole.RECEIVER,
      httpMethod: HttpMethod.Put,
      schema: OcpiEmptyResponseSchema,
      body: { id: 'sess-001' },
      path: '/FR/ZET/sess-001',
    });

    expect(requestSpy).toHaveBeenCalledTimes(2);
    expect(responses).toHaveLength(2);
    expect(requestSpy.mock.calls[0]).toEqual(
      expect.arrayContaining(['FR', 'ZET', 'FR', 'CPO']),
    );
    expect(requestSpy.mock.calls[1]).toEqual(
      expect.arrayContaining(['FR', 'ZET', 'DE', 'EVP']),
    );
  });

  it('only calls request() for partners that pass partnerFilter', async () => {
    const { BaseClientApi } = require('../BaseClientApi');
    const { HttpMethod } = require('@zetra/citrineos-base');

    const partnerA = {
      id: 1,
      countryCode: 'FR',
      partyId: 'CPO',
      partnerProfileOCPI: {},
    };
    const partnerB = {
      id: 2,
      countryCode: 'DE',
      partyId: 'EVP',
      partnerProfileOCPI: {},
    };

    const mockOcpiGraphqlClient = {
      request: jest
        .fn()
        .mockResolvedValue({ TenantPartners: [partnerA, partnerB] }),
    };
    const requestSpy = jest.fn().mockResolvedValue({});

    class SucceedingClientApi extends BaseClientApi {
      getUrl(): string {
        return 'https://partner.example.com';
      }
      async request(...args: unknown[]): Promise<any> {
        return requestSpy(...args);
      }
    }

    const api = new SucceedingClientApi() as any;
    api.logger = {
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
    api.ocpiGraphqlClient = mockOcpiGraphqlClient;
    api.partnerMtlsCertificateService = {};
    api.gireveBroadcastRetryOutbox = { upsertOnFailure: jest.fn() };

    await api.broadcastToClients({
      cpoCountryCode: 'FR',
      cpoPartyId: 'ZET',
      moduleId: ModuleId.Sessions,
      interfaceRole: InterfaceRole.RECEIVER,
      httpMethod: HttpMethod.Put,
      schema: OcpiEmptyResponseSchema,
      body: { id: 'sess-001' },
      path: '/FR/ZET/sess-001',
      partnerFilter: (p: { id: number }) => p.id === 1, // only partnerA
    });

    expect(requestSpy).toHaveBeenCalledTimes(1);
  });
});
