// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

/**
 * Sessions module OCPI 2.2.1 - eMSP Receiver — direct (non-hub) CPO mapping tests.
 *
 * Converted from Tests/sessions-test-curls.sh.
 *
 * Topology:
 *   - Our platform acts as eMSP: FR/ZET (the Tenant).
 *   - Partner CPO (direct TenantPartner, non-roaming): FR/CPO (id=2 in
 *     seeders/20250806120002-default-tenant-partner.ts), authenticated via
 *     ocpiCpoHeaders().
 *
 * NOTE: the original bash script used the CPO party "108" (with header
 * OCPI-from-party-id: 108) to demonstrate the receiver flow. The seeded test
 * DB only configures a direct TenantPartner for FR/CPO (matching
 * ocpiCpoHeaders()'s token), so this suite uses FR/CPO throughout — the
 * scenario coverage (create/read/patch/replace/paginate/404) is identical.
 *
 * Per OCPI 2.2.1, Sessions are owned by the CPO. Receiver endpoints use the
 * CPO's country_code/party_id in the URL:
 *   {sessions_endpoint_url}/{country_code}/{party_id}/{session_id}
 *
 * Sessions have no DELETE route (see SessionsModuleApi.ts — only GET, PUT,
 * PATCH are exposed), so unlike the Tariffs suite we cannot clean up between
 * tests with an afterEach(DELETE). Instead, each test uses a session id
 * suffixed with a per-run RUN_ID (same approach as cdrsHubMapping.test.ts)
 * so repeated runs never collide with rows left behind by a previous run.
 *
 * NOTE: ocpi-client.ts's exported RECEIVER_URL/SENDER_URL are hardcoded to
 * the /tariffs endpoint (used by the Tariffs suite), so — mirroring
 * cdrsHubMapping.test.ts — this suite builds its own /sessions URLs locally
 * instead of importing those constants.
 */

import { describe, expect, it } from '@jest/globals';
import { randomUUID } from 'crypto';
import {
  http,
  ocpiCpoHeaders,
  graphqlQuery,
} from '../../../../Tests/helpers/ocpi-client';

const OCPI_BASE = process.env.OCPI_BASE ?? 'http://localhost:8085/ocpi';
const OCPI_VERSION = process.env.OCPI_VERSION ?? '2.2.1';
const SESSIONS_RECEIVER_URL = `${OCPI_BASE}/emsp/${OCPI_VERSION}/sessions`;
const SESSIONS_SENDER_URL = `${OCPI_BASE}/cpo/${OCPI_VERSION}/sessions`;

const CPO_COUNTRY = 'FR';
const CPO_PARTY = 'CPO';

// Unique per test-run so re-running this suite never collides with Sessions
// left behind by a previous run (Sessions cannot be deleted via the API).
const RUN_ID = randomUUID().slice(0, 8);

function sessionUrl(id: string) {
  return `${SESSIONS_RECEIVER_URL}/${CPO_COUNTRY}/${CPO_PARTY}/${id}`;
}

async function putSession(id: string, body: unknown) {
  return http.put(sessionUrl(id), body, { headers: ocpiCpoHeaders() });
}

async function patchSession(id: string, body: unknown) {
  return http.patch(sessionUrl(id), body, { headers: ocpiCpoHeaders() });
}

async function getSession(id: string) {
  return http.get(sessionUrl(id), { headers: ocpiCpoHeaders() });
}

function activeSession(id: string, overrides: Record<string, unknown> = {}) {
  return {
    country_code: CPO_COUNTRY,
    party_id: CPO_PARTY,
    id,
    start_date_time: '2024-06-15T10:00:00Z',
    kwh: 5.2,
    cdr_token: {
      uid: `TOKEN-${id}`,
      type: 'RFID',
      contract_id: `FRZET-CONTRACT-${id}`,
      country_code: 'FR',
      party_id: 'ZET',
    },
    auth_method: 'WHITELIST',
    location_id: `LOC-${id}`,
    evse_uid: `FR*CPO*E-${id}`,
    connector_id: '1',
    currency: 'EUR',
    status: 'ACTIVE',
    last_updated: '2024-06-15T10:15:00Z',
    ...overrides,
  };
}

function completedSessionWithPeriods(
  id: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    country_code: CPO_COUNTRY,
    party_id: CPO_PARTY,
    id,
    start_date_time: '2024-06-14T14:00:00Z',
    end_date_time: '2024-06-14T15:30:00Z',
    kwh: 22.4,
    cdr_token: {
      uid: `TOKEN-${id}`,
      type: 'RFID',
      contract_id: `FRZET-CONTRACT-${id}`,
      country_code: 'FR',
      party_id: 'ZET',
    },
    auth_method: 'WHITELIST',
    location_id: `LOC-${id}`,
    evse_uid: `FR*CPO*E-${id}`,
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
      {
        start_date_time: '2024-06-14T14:30:00Z',
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

describe('PUT + GET round trip', () => {
  it('creates an ACTIVE session and echoes matching data on GET', async () => {
    const id = `sess-active-${RUN_ID}`;
    const putResp = await putSession(id, activeSession(id));
    expect(putResp.status).toBe(200);
    expect(putResp.data.status_code).toBe(1000); // OCPI success code

    const getResp = await getSession(id);
    expect(getResp.status).toBe(200);
    const data = getResp.data.data;

    expect(data.country_code).toBe(CPO_COUNTRY);
    expect(data.party_id).toBe(CPO_PARTY);
    expect(data.id).toBe(id);
    expect(data.kwh).toBeCloseTo(5.2);
    expect(data.status).toBe('ACTIVE');
    expect(data.auth_method).toBe('WHITELIST');
    expect(data.currency).toBe('EUR');
    expect(data.location_id).toBe(`LOC-${id}`);
    expect(data.evse_uid).toBe(`FR*CPO*E-${id}`);
    expect(data.connector_id).toBe('1');
    expect(data.cdr_token.uid).toBe(`TOKEN-${id}`);
    expect(data.end_date_time ?? null).toBeNull();
  });

  it('creates a COMPLETED session with charging_periods and total_cost', async () => {
    const id = `sess-completed-${RUN_ID}`;
    const putResp = await putSession(id, completedSessionWithPeriods(id));
    expect(putResp.status).toBe(200);

    const getResp = await getSession(id);
    expect(getResp.status).toBe(200);
    const data = getResp.data.data;

    expect(data.status).toBe('COMPLETED');
    expect(data.kwh).toBeCloseTo(22.4);
    expect(data.charging_periods).toHaveLength(2);
    expect(data.charging_periods[0].dimensions[0].type).toBe('ENERGY');
    expect(data.charging_periods[0].dimensions[0].volume).toBeCloseTo(11.2);
    expect(data.total_cost.excl_vat).toBeCloseTo(5.6);
    expect(data.end_date_time).toBeTruthy();
  });

  it('maps and stores the session correctly in the DB (bypassing the API)', async () => {
    const id = `sess-db-${RUN_ID}`;
    await putSession(id, activeSession(id));

    const result = await graphqlQuery<{
      Sessions: {
        ocpiSessionId: string;
        currency: string;
        status: string;
        TenantPartner: { countryCode: string; partyId: string };
        roamingPartnerId: number | null;
      }[];
    }>(
      `query ($ocpiSessionId: String!) {
        Sessions(where: { ocpiSessionId: { _eq: $ocpiSessionId } }) {
          ocpiSessionId
          currency
          status
          TenantPartner { countryCode partyId }
          roamingPartnerId
        }
      }`,
      { ocpiSessionId: id },
    );

    expect(result.Sessions).toHaveLength(1);
    const [row] = result.Sessions;
    expect(row.currency).toBe('EUR');
    expect(row.status).toBe('ACTIVE');
    expect(row.TenantPartner.countryCode).toBe(CPO_COUNTRY);
    expect(row.TenantPartner.partyId).toBe(CPO_PARTY);
    // Direct (non-roaming) CPO: no RoamingPartner should be attached.
    expect(row.roamingPartnerId).toBeNull();
  });
});

describe('PATCH partial update', () => {
  it('updates kwh and adds a charging period (merged with existing ones)', async () => {
    const id = `sess-patch-${RUN_ID}`;
    await putSession(id, activeSession(id)); // starts with no charging_periods

    const patchResp = await patchSession(id, {
      kwh: 12.8,
      charging_periods: [
        {
          start_date_time: '2024-06-15T10:00:00Z',
          dimensions: [
            { type: 'ENERGY', volume: 12.8 },
            { type: 'TIME', volume: 0.5 },
          ],
          tariff_id: 'tariff-std-001',
        },
      ],
      last_updated: '2024-06-15T10:30:00Z',
    });
    expect(patchResp.status).toBe(200);
    expect(patchResp.data.status_code).toBe(1000);

    const getResp = await getSession(id);
    expect(getResp.status).toBe(200);
    const data = getResp.data.data;

    expect(data.kwh).toBeCloseTo(12.8);
    // SessionsService.patchSession merges new charging_periods onto the
    // existing (empty) list rather than replacing the whole session, so we
    // expect exactly the one period supplied in the patch.
    expect(data.charging_periods).toHaveLength(1);
    expect(data.charging_periods[0].dimensions[0].volume).toBeCloseTo(12.8);
  });

  it('accumulates charging periods across successive PATCHes', async () => {
    const id = `sess-patch-accum-${RUN_ID}`;
    await putSession(id, activeSession(id));

    await patchSession(id, {
      charging_periods: [
        {
          start_date_time: '2024-06-15T10:00:00Z',
          dimensions: [{ type: 'ENERGY', volume: 5.0 }],
          tariff_id: 'tariff-std-001',
        },
      ],
      last_updated: '2024-06-15T10:20:00Z',
    });
    await patchSession(id, {
      charging_periods: [
        {
          start_date_time: '2024-06-15T10:30:00Z',
          dimensions: [{ type: 'ENERGY', volume: 5.0 }],
          tariff_id: 'tariff-std-001',
        },
      ],
      last_updated: '2024-06-15T10:40:00Z',
    });

    const getResp = await getSession(id);
    expect(getResp.data.data.charging_periods).toHaveLength(2);
  });

  it('leaves existing charging_periods untouched when the patch omits them', async () => {
    const id = `sess-patch-preserve-${RUN_ID}`;
    await putSession(id, completedSessionWithPeriods(id));

    const patchResp = await patchSession(id, {
      kwh: 30.0,
      last_updated: '2024-06-14T16:00:00Z',
    });
    expect(patchResp.status).toBe(200);

    const getResp = await getSession(id);
    expect(getResp.data.data.kwh).toBeCloseTo(30.0);
    expect(getResp.data.data.charging_periods).toHaveLength(2);
  });

  it('returns 404 when patching a non-existent session', async () => {
    const resp = await patchSession(`sess-nonexistent-${RUN_ID}`, {
      kwh: 10,
      last_updated: '2024-06-15T12:00:00Z',
    });
    expect(resp.status).toBe(404);
  });
});

describe('PUT full replace', () => {
  it('replaces the session (status/kwh/charging_periods) on a subsequent PUT', async () => {
    const id = `sess-replace-${RUN_ID}`;
    await putSession(id, activeSession(id));

    const replaceResp = await putSession(
      id,
      completedSessionWithPeriods(id, {
        start_date_time: '2024-06-15T10:00:00Z',
        end_date_time: '2024-06-15T11:00:00Z',
        kwh: 25.0,
        location_id: `LOC-${id}`,
        evse_uid: `FR*CPO*E-${id}`,
        connector_id: '1',
        charging_periods: [
          {
            start_date_time: '2024-06-15T10:00:00Z',
            dimensions: [
              { type: 'ENERGY', volume: 25.0 },
              { type: 'TIME', volume: 1.0 },
            ],
            tariff_id: 'tariff-std-001',
          },
        ],
        total_cost: { excl_vat: 6.25 },
      }),
    );
    expect(replaceResp.status).toBe(200);

    const getResp = await getSession(id);
    const data = getResp.data.data;
    expect(data.status).toBe('COMPLETED');
    expect(data.kwh).toBeCloseTo(25.0);
    // PUT replace overwrites charging_periods wholesale (unlike PATCH, which merges).
    expect(data.charging_periods).toHaveLength(1);
    expect(data.charging_periods[0].dimensions[0].volume).toBeCloseTo(25.0);
    expect(data.total_cost.excl_vat).toBeCloseTo(6.25);
  });
});

describe('error paths', () => {
  it('returns 404 for a non-existent session', async () => {
    const resp = await getSession(`sess-nonexistent-get-${RUN_ID}`);
    expect(resp.status).toBe(404);
  });
});

describe('sender list + pagination', () => {
  it('lists our own sessions and paginates', async () => {
    const listResp = await http.get(SESSIONS_SENDER_URL, {
      headers: ocpiCpoHeaders(),
    });
    expect(listResp.status).toBe(200);

    const page1 = await http.get(SESSIONS_SENDER_URL, {
      headers: ocpiCpoHeaders(),
      params: { limit: 1, offset: 0 },
    });
    expect(page1.status).toBe(200);
  });
});
