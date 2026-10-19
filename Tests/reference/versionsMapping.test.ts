// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

/**
 * Versions module OCPI 2.2.1 (§4.1, §4.2).
 *
 * Role-agnostic: the version endpoint is the entry point of the registration
 * handshake for both our CPO and our eMSP identity, so there is no
 * /cpo vs /emsp split here.
 *
 * NOTE: this controller is mounted as GET /ocpi/versions/:tenant_id, which is
 * NOT the spec URL (§4.1 takes no path segment). Partners only ever see the
 * versionsUrl we hand them in credentials, so this is legal — but the seeded
 * versionsUrl must match, and today it does not. See TENANT_ID below.
 */

import { describe, expect, it } from '@jest/globals';
import { randomUUID } from 'crypto';
import { http } from '../../../../Tests/helpers/ocpi-client';

const OCPI_BASE = process.env.OCPI_BASE ?? 'http://localhost:8085/ocpi';
const OCPI_VERSION = process.env.OCPI_VERSION ?? '2.2.1';
const TENANT_ID = Number(process.env.OCPI_TENANT_ID ?? 1);

const AUTH_TOKEN =
  process.env.OCPI_AUTH_TOKEN ??
  'Token NzA3YjQ0ODQtMDQ0OC00YmFmLThhY2ItYzc5ZDczYzc1ODY5';

function registrationHeaders(token: string = AUTH_TOKEN) {
  return {
    Authorization: token,
    'X-Request-ID': randomUUID(),
    'X-Correlation-ID': randomUUID(),
    'Content-Type': 'application/json',
  };
}

describe('GET /versions (§4.1)', () => {
  it('lists supported versions with resolvable version detail URLs', async () => {
    const resp = await http.get(`${OCPI_BASE}/versions/${TENANT_ID}`, {
      headers: registrationHeaders(),
    });

    expect(resp.status).toBe(200);
    expect(resp.data.status_code).toBe(1000);
    expect(Array.isArray(resp.data.data)).toBe(true);

    const v221 = resp.data.data.find((v: any) => v.version === OCPI_VERSION);
    expect(v221).toBeDefined();
    expect(typeof v221.url).toBe('string');
    expect(v221.url).toMatch(/^https?:\/\//);
  });

  it('rejects an unauthenticated request', async () => {
    const resp = await http.get(`${OCPI_BASE}/versions/${TENANT_ID}`, {
      headers: {
        'X-Request-ID': randomUUID(),
        'X-Correlation-ID': randomUUID(),
      },
    });
    expect([401, 403]).toContain(resp.status);
  });

  it('rejects an unknown token', async () => {
    const resp = await http.get(`${OCPI_BASE}/versions/${TENANT_ID}`, {
      headers: registrationHeaders('Token bm9wZS1ub3QtYS1yZWFsLXRva2Vu'),
    });
    expect([401, 403]).toContain(resp.status);
  });
});

describe('GET /versions/{version} — version details (§4.2)', () => {
  it('returns the endpoint list for 2.2.1 with identifier+role+url on each', async () => {
    const resp = await http.get(
      `${OCPI_BASE}/versions/${TENANT_ID}/${OCPI_VERSION}`,
      { headers: registrationHeaders() },
    );

    expect(resp.status).toBe(200);
    expect(resp.data.status_code).toBe(1000);
    expect(resp.data.data.version).toBe(OCPI_VERSION);

    const endpoints = resp.data.data.endpoints;
    expect(Array.isArray(endpoints)).toBe(true);
    expect(endpoints.length).toBeGreaterThan(0);

    for (const ep of endpoints) {
      expect(typeof ep.identifier).toBe('string');
      expect(['SENDER', 'RECEIVER']).toContain(ep.role); // §4.2: mandatory in 2.2.x
      expect(ep.url).toMatch(/^https?:\/\//);
    }

    // credentials is mandatory on every 2.2.1 version-details response (§7.1)
    expect(endpoints.map((e: any) => e.identifier)).toContain('credentials');
  });

  it('advertises both our CPO sender and our eMSP receiver interfaces', async () => {
    const resp = await http.get(
      `${OCPI_BASE}/versions/${TENANT_ID}/${OCPI_VERSION}`,
      { headers: registrationHeaders() },
    );
    const endpoints: any[] = resp.data.data.endpoints;

    const byId = (id: string) => endpoints.filter((e) => e.identifier === id);

    // We are a CPO: we must expose locations as SENDER.
    expect(byId('locations').some((e) => e.role === 'SENDER')).toBe(true);
    // We are also an eMSP: we must expose sessions/cdrs as RECEIVER.
    expect(byId('sessions').some((e) => e.role === 'RECEIVER')).toBe(true);
    expect(byId('cdrs').some((e) => e.role === 'RECEIVER')).toBe(true);
  });

  it('returns an OCPI error for an unsupported version', async () => {
    const resp = await http.get(`${OCPI_BASE}/versions/${TENANT_ID}/2.0`, {
      headers: registrationHeaders(),
    });
    // 3001 = unsupported version (§5.2)
    expect(resp.status === 404 || resp.data?.status_code === 3001).toBe(true);
  });
});
