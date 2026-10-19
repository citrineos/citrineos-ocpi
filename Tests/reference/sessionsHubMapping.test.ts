// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

/**
 * Sessions module OCPI 2.2.1 - eMSP Receiver — Hub / Roaming Partner
 * isolation tests.
 *
 * Converted from Tests/sessions-hub-test-curls.sh and
 * Tests/sessions-hub-test-curls-bis.sh.
 *
 * Topology (mirrors tariffEHUBMapping.test.ts / cdrsHubMapping.test.ts):
 *   - Our platform acts as eMSP (the Tenant): FR/ZET.
 *   - Hub (TenantPartner): FR/123, authenticated with HUB_AUTH_TOKEN
 *     (seeders/20250806120002-default-tenant-partner.ts, tenantPartnerHUB,
 *     id=3). The hub forwards both roaming CPOs' pushes with IDENTICAL
 *     routing headers — only the URL path distinguishes the originating CPO.
 *   - Roaming CPO A (RoamingPartner under the hub): FR/CPO (id=1).
 *   - Roaming CPO B (RoamingPartner under the hub): FR/BTU (id=2).
 *
 * NOTE: the original bash scripts used DE/EVP as the second roaming partner
 * (and FR/107 as the hub's own party id). The seeded test DB
 * (seeders/20260803171237-default-roaming-partner.ts) only configures
 * FR/CPO and FR/BTU as RoamingPartners under the FR/123 hub tenant partner,
 * so — exactly as done in cdrsHubMapping.test.ts — this suite substitutes
 * FR/BTU for DE/EVP throughout. The scenario under test (two roaming
 * partners pushing sessions with colliding OCPI ids, and verifying they are
 * never conflated) is identical; only the second partner's identity differs.
 *
 * Per OCPI 2.2.1 (§9.2.1-9.2.3), Receiver endpoints use the CPO's
 * country_code/party_id in the URL:
 *   {sessions_url}/{country_code}/{party_id}/{session_id}
 * Roaming partner identity for auth/authorization purposes is resolved from
 * the OCPI-from-country-code / OCPI-from-party-id headers (AuthMiddleware),
 * while the *storage* namespace (which RoamingPartner row a session belongs
 * to) is resolved from the URL's country_code/party_id via
 * getRoamingPartner() in SessionsService — see 00_Base/src/util/helpers.ts.
 *
 * Sessions have no DELETE route (SessionsModuleApi.ts exposes only GET,
 * PUT, PATCH), so — like cdrsHubMapping.test.ts — each test suffixes its
 * session ids with a per-run RUN_ID instead of relying on afterEach cleanup,
 * so repeated runs never collide with rows left behind by a previous run.
 */

import { describe, expect, it } from '@jest/globals';
import { randomUUID } from 'crypto';
import {
  http,
  ocpiHubHeaders,
  graphqlQuery,
} from '../../../Tests/helpers/ocpi-client';

const OCPI_BASE = process.env.OCPI_BASE ?? 'http://localhost:8085/ocpi';
const OCPI_VERSION = process.env.OCPI_VERSION ?? '2.2.1';
const SESSIONS_RECEIVER_URL = `${OCPI_BASE}/emsp/${OCPI_VERSION}/sessions`;

type Cpo = { countryCode: string; partyId: string };

const CPO_A: Cpo = { countryCode: 'FR', partyId: 'CPO' };
const CPO_B: Cpo = { countryCode: 'FR', partyId: 'BTU' };

// Unique per test-run so re-running this suite never collides with Sessions
// left behind by a previous run (Sessions cannot be deleted via the API).
const RUN_ID = randomUUID().slice(0, 8);

function hubHeaders(cpo: Cpo) {
  return ocpiHubHeaders(cpo.partyId, cpo.countryCode);
}

function sessionUrl(cpo: Cpo, id: string) {
  return `${SESSIONS_RECEIVER_URL}/${cpo.countryCode}/${cpo.partyId}/${id}`;
}

async function putSession(cpo: Cpo, id: string, body: unknown) {
  return http.put(sessionUrl(cpo, id), body, { headers: hubHeaders(cpo) });
}

async function patchSession(cpo: Cpo, id: string, body: unknown) {
  return http.patch(sessionUrl(cpo, id), body, { headers: hubHeaders(cpo) });
}

async function getSession(cpo: Cpo, id: string) {
  return http.get(sessionUrl(cpo, id), { headers: hubHeaders(cpo) });
}

function activeSession(
  cpo: Cpo,
  id: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    country_code: cpo.countryCode,
    party_id: cpo.partyId,
    id,
    start_date_time: '2024-06-15T10:00:00Z',
    kwh: 5.2,
    cdr_token: {
      uid: `TOKEN-${cpo.partyId}-${id}`,
      type: 'RFID',
      contract_id: `FRZET-CONTRACT-${cpo.partyId}-${id}`,
      country_code: 'FR',
      party_id: 'ZET',
    },
    auth_method: 'WHITELIST',
    location_id: `LOC-${cpo.partyId}-${id}`,
    evse_uid: `${cpo.countryCode}*${cpo.partyId}*E-${id}`,
    connector_id: '1',
    currency: 'EUR',
    status: 'ACTIVE',
    last_updated: '2024-06-15T10:15:00Z',
    ...overrides,
  };
}

function completedSessionWithPeriods(
  cpo: Cpo,
  id: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    country_code: cpo.countryCode,
    party_id: cpo.partyId,
    id,
    start_date_time: '2024-06-14T14:00:00Z',
    end_date_time: '2024-06-14T15:30:00Z',
    kwh: 22.4,
    cdr_token: {
      uid: `TOKEN-${cpo.partyId}-${id}`,
      type: 'RFID',
      contract_id: `FRZET-CONTRACT-${cpo.partyId}-${id}`,
      country_code: 'FR',
      party_id: 'ZET',
    },
    auth_method: 'WHITELIST',
    location_id: `LOC-${cpo.partyId}-${id}`,
    evse_uid: `${cpo.countryCode}*${cpo.partyId}*E-${id}`,
    connector_id: '2',
    currency: 'EUR',
    charging_periods: [
      {
        start_date_time: '2024-06-14T14:00:00Z',
        dimensions: [
          { type: 'ENERGY', volume: 11.2 },
          { type: 'TIME', volume: 0.5 },
        ],
        tariff_id: 'tariff-std-001',
      },
    ],
    total_cost: { excl_vat: 5.6 },
    status: 'COMPLETED',
    last_updated: '2024-06-14T15:30:00Z',
    ...overrides,
  };
}

describe('hub / roaming partner isolation', () => {
  it('creates sessions independently for two roaming CPOs sharing the same OCPI id', async () => {
    const sharedId = `sess-shared-${RUN_ID}`;

    const putA = await putSession(
      CPO_A,
      sharedId,
      activeSession(CPO_A, sharedId, { kwh: 5.2 }),
    );
    expect(putA.status).toBe(200);
    expect(putA.data.status_code).toBe(1000);

    const putB = await putSession(
      CPO_B,
      sharedId,
      activeSession(CPO_B, sharedId, { kwh: 3.1 }),
    );
    expect(putB.status).toBe(200);
    expect(putB.data.status_code).toBe(1000);

    // Critical isolation check: identical hub headers were used for both
    // PUTs above; only the URL differed. The GETs below carry the same
    // (identical) hub headers too — only the URL distinguishes the CPOs.
    const getA = await getSession(CPO_A, sharedId);
    expect(getA.status).toBe(200);
    expect(getA.data.data.party_id).toBe('CPO');
    expect(getA.data.data.kwh).toBeCloseTo(5.2);
    expect(getA.data.data.evse_uid).toBe(`FR*CPO*E-${sharedId}`);

    const getB = await getSession(CPO_B, sharedId);
    expect(getB.status).toBe(200);
    expect(getB.data.data.party_id).toBe('BTU');
    expect(getB.data.data.kwh).toBeCloseTo(3.1);
    expect(getB.data.data.evse_uid).toBe(`FR*BTU*E-${sharedId}`);
  });

  it('returns 404 independently for each roaming partner on a non-existent session', async () => {
    const missingId = `sess-missing-${RUN_ID}`;
    const getA = await getSession(CPO_A, missingId);
    expect(getA.status).toBe(404);

    const getB = await getSession(CPO_B, missingId);
    expect(getB.status).toBe(404);
  });

  it("patching CPO A's session does not affect CPO B's session with the same id", async () => {
    const sharedId = `sess-patch-shared-${RUN_ID}`;
    await putSession(
      CPO_A,
      sharedId,
      activeSession(CPO_A, sharedId, { kwh: 5.2 }),
    );
    await putSession(
      CPO_B,
      sharedId,
      activeSession(CPO_B, sharedId, { kwh: 3.1 }),
    );

    const patchA = await patchSession(CPO_A, sharedId, {
      kwh: 12.8,
      charging_periods: [
        {
          start_date_time: '2024-06-15T10:00:00Z',
          dimensions: [{ type: 'ENERGY', volume: 12.8 }],
          tariff_id: 'tariff-std-001',
        },
      ],
      last_updated: '2024-06-15T10:30:00Z',
    });
    expect(patchA.status).toBe(200);

    const getAAfterPatch = await getSession(CPO_A, sharedId);
    expect(getAAfterPatch.data.data.kwh).toBeCloseTo(12.8);
    expect(getAAfterPatch.data.data.charging_periods).toHaveLength(1);

    // The core hub isolation assertion: patching CPO A must not touch CPO B.
    const getBUnaffected = await getSession(CPO_B, sharedId);
    expect(getBUnaffected.status).toBe(200);
    expect(getBUnaffected.data.data.kwh).toBeCloseTo(3.1);
    expect(getBUnaffected.data.data.charging_periods ?? null).toBeNull();

    // CPO B can be patched independently afterwards.
    const patchB = await patchSession(CPO_B, sharedId, {
      kwh: 8.7,
      last_updated: '2024-06-15T09:45:00Z',
    });
    expect(patchB.status).toBe(200);

    const getBAfterPatch = await getSession(CPO_B, sharedId);
    expect(getBAfterPatch.data.data.kwh).toBeCloseTo(8.7);

    // CPO A must remain unaffected by CPO B's patch.
    const getAStillPatched = await getSession(CPO_A, sharedId);
    expect(getAStillPatched.data.data.kwh).toBeCloseTo(12.8);
  });

  it('returns 404 independently when PATCHing a non-existent session for each roaming partner', async () => {
    const missingId = `sess-patch-missing-${RUN_ID}`;
    const patchA = await patchSession(CPO_A, missingId, {
      kwh: 10,
      last_updated: '2024-06-15T12:00:00Z',
    });
    expect(patchA.status).toBe(404);

    const patchB = await patchSession(CPO_B, missingId, {
      kwh: 10,
      last_updated: '2024-06-15T12:00:00Z',
    });
    expect(patchB.status).toBe(404);
  });

  it("replacing CPO A's session via PUT does not affect CPO B's session with the same id", async () => {
    const sharedId = `sess-replace-shared-${RUN_ID}`;
    await putSession(
      CPO_A,
      sharedId,
      activeSession(CPO_A, sharedId, { kwh: 5.2 }),
    );
    await putSession(
      CPO_B,
      sharedId,
      activeSession(CPO_B, sharedId, { kwh: 8.7, status: 'ACTIVE' }),
    );

    const replaceA = await putSession(
      CPO_A,
      sharedId,
      completedSessionWithPeriods(CPO_A, sharedId, {
        start_date_time: '2024-06-15T10:00:00Z',
        end_date_time: '2024-06-15T11:00:00Z',
        kwh: 25.0,
        status: 'COMPLETED',
      }),
    );
    expect(replaceA.status).toBe(200);

    const getAReplaced = await getSession(CPO_A, sharedId);
    expect(getAReplaced.data.data.status).toBe('COMPLETED');
    expect(getAReplaced.data.data.kwh).toBeCloseTo(25.0);

    // CPO B's session (last set to kwh=8.7, ACTIVE) must remain untouched.
    const getBUnaffected = await getSession(CPO_B, sharedId);
    expect(getBUnaffected.data.data.status).toBe('ACTIVE');
    expect(getBUnaffected.data.data.kwh).toBeCloseTo(8.7);
  });

  it('stores a session under the URL namespace even when the body disagrees (URL wins)', async () => {
    // Body says CPO_A's identity, but the PUT is sent to CPO_B's URL. Per
    // OCPI §9.2.1 the URL is authoritative: SessionsModuleApi.putSession
    // overwrites country_code/party_id from the URL params before calling
    // upsertSession, so the session must land under CPO_B, not CPO_A.
    const id = `sess-mismatch-${RUN_ID}`;
    const bodyClaimingCpoA = activeSession(CPO_A, id, { kwh: 1.0 });

    const put = await putSession(CPO_B, id, bodyClaimingCpoA);
    expect(put.status).toBe(200);

    const getUnderB = await getSession(CPO_B, id);
    expect(getUnderB.status).toBe(200);
    expect(getUnderB.data.data.party_id).toBe('BTU');

    const getUnderA = await getSession(CPO_A, id);
    expect(getUnderA.status).toBe(404);
  });

  it('maps hub-forwarded sessions to the correct RoamingPartner rows in the DB', async () => {
    const sharedId = `sess-db-shared-${RUN_ID}`;
    await putSession(CPO_A, sharedId, activeSession(CPO_A, sharedId));
    await putSession(CPO_B, sharedId, activeSession(CPO_B, sharedId));

    const result = await graphqlQuery<{
      Sessions: {
        ocpiSessionId: string;
        currency: string;
        TenantPartner: { countryCode: string; partyId: string };
        RoamingPartner: { countryCode: string; partyId: string } | null;
      }[];
    }>(
      `query ($ocpiSessionId: String!) {
        Sessions(where: { ocpiSessionId: { _eq: $ocpiSessionId } }) {
          ocpiSessionId
          currency
          TenantPartner { countryCode partyId }
          RoamingPartner { countryCode partyId }
        }
      }`,
      { ocpiSessionId: sharedId },
    );

    expect(result.Sessions).toHaveLength(2);
    expect(
      result.Sessions.every((s) => s.TenantPartner.partyId === '123'),
    ).toBe(true);
    const pairs = result.Sessions.map(
      (s) => `${s.RoamingPartner?.countryCode}/${s.RoamingPartner?.partyId}`,
    );
    expect(pairs).toEqual(expect.arrayContaining(['FR/CPO', 'FR/BTU']));
  });
});
