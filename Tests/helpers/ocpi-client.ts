// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

/**
 * HTTP client for the Tests/reference suites. They drive a real OCPI server over HTTP;
 * Tests/helpers/e2eGlobalSetup.ts boots it (plus Postgres, Hasura, RabbitMQ, seeders) and
 * exports OCPI_BASE / HASURA_URL / HASURA_ADMIN_SECRET before any suite is loaded.
 *
 * Tokens are the seeders' serverCredentials.token: AuthMiddleware looks the partner up by
 * that field (GET_TENANT_PARTNER_BY_SERVER_TOKEN) after base64-decoding the header.
 */
import { expect } from 'vitest';

const OCPI_BASE = process.env.OCPI_BASE ?? 'http://localhost:8085/ocpi';
const OCPI_VERSION = process.env.OCPI_VERSION ?? '2.2.1';

// Tariffs only: the Sessions/CDRs/Locations suites build their own URLs.
export const RECEIVER_URL = `${OCPI_BASE}/emsp/${OCPI_VERSION}/tariffs`;
export const SENDER_URL = `${OCPI_BASE}/cpo/${OCPI_VERSION}/tariffs`;

// seeders/20250806120002-default-tenant-partner.ts
export const CPO_AUTH_TOKEN = '707b4484-0448-4baf-8acb-c79d73c75869'; // FR/CPO, direct
export const HUB_AUTH_TOKEN = '3dff6358-637b-415f-9af7-7741d7df6672'; // FR/107, hub (Gireve preprod)

// seeders/20250806120001-default-tenant.ts
const TENANT = { countryCode: 'FR', partyId: 'ZET' };

export interface HttpResponse<T = any> {
  status: number;
  data: T;
  /** Lower-cased header names, e.g. headers['location']. */
  headers: Record<string, string>;
}

interface RequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, string | number | undefined>;
}

// Never throws on 4xx/5xx: suites assert on resp.status themselves.
async function request(
  method: string,
  url: string,
  body: unknown,
  opts: RequestOptions = {},
): Promise<HttpResponse> {
  const target = new URL(url);
  for (const [key, value] of Object.entries(opts.params ?? {})) {
    if (value !== undefined) target.searchParams.set(key, String(value));
  }
  const resp = await fetch(target, {
    method,
    headers: opts.headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await resp.text();
  let data: any = text;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    // non-JSON body (e.g. an HTML 404 page): keep the raw text
  }
  return {
    status: resp.status,
    data,
    headers: Object.fromEntries(resp.headers.entries()),
  };
}

export const http = {
  get: (url: string, opts?: RequestOptions) =>
    request('GET', url, undefined, opts),
  delete: (url: string, opts?: RequestOptions) =>
    request('DELETE', url, undefined, opts),
  post: (url: string, body: unknown, opts?: RequestOptions) =>
    request('POST', url, body, opts),
  put: (url: string, body: unknown, opts?: RequestOptions) =>
    request('PUT', url, body, opts),
  patch: (url: string, body: unknown, opts?: RequestOptions) =>
    request('PATCH', url, body, opts),
};

function ocpiHeaders(
  token: string,
  fromCountryCode: string,
  fromPartyId: string,
): Record<string, string> {
  return {
    Authorization: `Token ${Buffer.from(token).toString('base64')}`,
    'Content-Type': 'application/json',
    'X-Request-ID': crypto.randomUUID(),
    'X-Correlation-ID': crypto.randomUUID(),
    'OCPI-from-country-code': fromCountryCode,
    'OCPI-from-party-id': fromPartyId,
    'OCPI-to-country-code': TENANT.countryCode,
    'OCPI-to-party-id': TENANT.partyId,
  };
}

/** Direct (non-hub) CPO partner FR/CPO. */
export const ocpiCpoHeaders = () => ocpiHeaders(CPO_AUTH_TOKEN, 'FR', 'CPO');

/** Gireve hub ids as seeded and configured (preprod FR/107; prod is FR/007). */
export const HUB = { countryCode: 'FR', partyId: '107' } as const;

/** Hub FR/107 forwarding on behalf of a roaming CPO (FR/CPO or FR/BTU). */
export const ocpiHubHeaders = (
  partyId: string = HUB.partyId,
  countryCode: string = HUB.countryCode,
) => ocpiHeaders(HUB_AUTH_TOKEN, countryCode, partyId);

/**
 * OCPI 2.2.1 §5 error codes the suites assert. Kept here rather than imported from
 * 00_Base so the expected values come from the spec, not from the code under test.
 */
export const OcpiErrorCode = {
  GenericClientError: 2000,
  InvalidOrMissingParameters: 2001,
  NotEnoughInformation: 2002,
  UnknownLocation: 2003,
  UnknownToken: 2004,
} as const;
export type OcpiErrorCode = (typeof OcpiErrorCode)[keyof typeof OcpiErrorCode];

/** Asserts the exact OCPI status_code: "some 2xxx" would hide 2001 vs 2003 vs 2004 mix-ups. */
export function assertOcpiError(body: any, expectedCode: OcpiErrorCode): void {
  expect(body?.status_code).toBe(expectedCode);
}

export async function graphqlQuery<T>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  const resp = await fetch(
    process.env.HASURA_URL ?? 'http://localhost:8090/v1/graphql',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hasura-admin-secret': process.env.HASURA_ADMIN_SECRET ?? '',
      },
      body: JSON.stringify({ query, variables }),
    },
  );
  const json: any = await resp.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data;
}
