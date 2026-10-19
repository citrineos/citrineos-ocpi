// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

/**
 * Real-HTTP test: no override of BaseClientApi.request(). nock intercepts at the
 * Node http layer, so this proves a well-formed OCPI POST actually leaves the
 * process — URL, method, auth header, routing headers and JSON body included.
 *
 * Only the typedi-@Inject()ed collaborators are stubbed. awsSecretCertificateArn
 * is left null so request() uses the plain RestClient and never reaches
 * PartnerMtlsCertificateService (the mTLS path needs its own test).
 */

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

jest.mock('../../util/helpers', () => ({
  shouldBroadcastToPartner: jest.fn().mockReturnValue(true),
  handleHttpMethodForPartner: jest.fn((httpMethod: unknown) => httpMethod),
  isGirevePartner: jest.fn().mockReturnValue(false),
}));

import nock from 'nock';
import { CdrsClientApi } from '../CdrsClientApi.js';
import { ModuleId } from '../../model/ModuleId.js';
import { InterfaceRole } from '../../model/InterfaceRole.js';
import { EndpointIdentifier } from '../../model/EndpointIdentifier.js';
import { OcpiEmptyResponseSchema } from '../../model/OcpiEmptyResponse.js';
import { HttpMethod } from '@zetra/citrineos-base';

const PARTNER_HOST = 'https://partner.example.com';
const PARTNER_PATH = '/ocpi/2.2.1/cdrs';

const cdrDto = {
  id: 'CDR-001',
  country_code: 'FR',
  party_id: 'CPO',
  currency: 'EUR',
  total_cost: { excl_vat: 10, incl_vat: 12 },
  total_energy: 20,
  total_time: 1,
};

// Must satisfy OcpiEmptyResponseSchema: status_code + timestamp, and no `data`.
const OCPI_SUCCESS_BODY = {
  status_code: 1000,
  status_message: 'Success',
  timestamp: '2026-01-01T11:00:05Z',
};

function makeApi() {
  const api = new CdrsClientApi() as any;
  api.logger = {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
  api.ocpiGraphqlClient = {
    request: jest.fn().mockResolvedValue({
      TenantPartners: [
        {
          id: 42,
          countryCode: 'FR',
          partyId: 'EMS',
          awsSecretCertificateArn: null, // -> plain RestClient, no mTLS
          partnerProfileOCPI: {
            credentials: { token: 'secret-token' },
            endpoints: [
              {
                identifier: EndpointIdentifier.CDRS_RECEIVER,
                url: `${PARTNER_HOST}${PARTNER_PATH}`,
              },
            ],
          },
        },
      ],
    }),
  };
  api.partnerMtlsCertificateService = { getRestClient: jest.fn() };
  api.gireveBroadcastRetryOutbox = {
    upsertOnFailure: jest.fn().mockResolvedValue(undefined),
  };
  return api;
}

function broadcast(api: any) {
  return api.broadcastToClients({
    cpoCountryCode: 'FR',
    cpoPartyId: 'CPO',
    moduleId: ModuleId.Cdrs,
    interfaceRole: InterfaceRole.RECEIVER,
    httpMethod: HttpMethod.Post,
    schema: OcpiEmptyResponseSchema,
    body: cdrDto,
    ocpiToCountryCode: 'FR',
    ocpiToPartyId: 'EMS',
  });
}

beforeAll(() => {
  nock.disableNetConnect(); // any unintercepted request is a hard failure
});

afterEach(() => {
  nock.cleanAll();
});

afterAll(() => {
  nock.enableNetConnect();
});

describe('CdrsClientApi — real outbound HTTP', () => {
  it('POSTs the CDR to the partner endpoint with the exact JSON body', async () => {
    const scope = nock(PARTNER_HOST)
      .post(PARTNER_PATH, (body) => {
        expect(body).toEqual(cdrDto); // byte-for-byte the CDR we handed in
        return true;
      })
      .reply(200, OCPI_SUCCESS_BODY);

    const responses = await broadcast(makeApi());

    expect(scope.isDone()).toBe(true); // the request really went out
    expect(responses).toHaveLength(1);
    expect(responses[0].status_code).toBe(1000);
  });

  it('sends the OCPI auth and routing headers', async () => {
    const expectedAuth = `Token ${Buffer.from('secret-token').toString('base64')}`;

    const scope = nock(PARTNER_HOST, {
      reqheaders: {
        authorization: expectedAuth,
        'ocpi-from-country-code': 'FR',
        'ocpi-from-party-id': 'CPO',
        'ocpi-to-country-code': 'FR',
        'ocpi-to-party-id': 'EMS',
        'x-request-id': /^[0-9a-f-]{36}$/i,
        'x-correlation-id': /^[0-9a-f-]{36}$/i,
        'content-type': /application\/json/,
      },
    })
      .post(PARTNER_PATH)
      .reply(200, OCPI_SUCCESS_BODY);

    await broadcast(makeApi());

    // nock only matches the interceptor if every reqheader above matched.
    expect(scope.isDone()).toBe(true);
  });

  it('returns the parsed OCPI envelope, with timestamp coerced to a Date', async () => {
    nock(PARTNER_HOST).post(PARTNER_PATH).reply(200, OCPI_SUCCESS_BODY);

    const responses = await broadcast(makeApi());

    expect(responses[0].timestamp).toBeInstanceOf(Date);
    expect(responses[0].status_message).toBe('Success');
  });

  it('does not throw out of broadcastToClients when the partner returns 4xx', async () => {
    const scope = nock(PARTNER_HOST)
      .post(PARTNER_PATH)
      .reply(422, { status_code: 2001 });

    const api = makeApi();
    const responses = await broadcast(api);

    expect(scope.isDone()).toBe(true);
    expect(responses).toHaveLength(0); // per-partner failure is caught, not rethrown
    expect(api.logger.error).toHaveBeenCalled();
  });

  it('surfaces a connection failure the same way, without crashing the caller', async () => {
    const scope = nock(PARTNER_HOST)
      .post(PARTNER_PATH)
      .replyWithError(
        Object.assign(new Error('connect ECONNREFUSED'), {
          code: 'ECONNREFUSED',
        }),
      );

    const api = makeApi();
    const responses = await broadcast(api);

    expect(scope.isDone()).toBe(true);
    expect(responses).toHaveLength(0);
    expect(api.logger.error).toHaveBeenCalled();
  });
});
