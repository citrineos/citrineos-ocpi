// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

/**
 * Tokens module OCPI 2.2.1 - eMSP Receiver / Sender mapping tests.
 *
 * Converted from Tests/tokens-test-curls.sh.
 *
 * The original bash script authenticates as a single direct CPO partner
 * (FR/TMS calling our eMSP identity FR/ZTA). This suite uses the seeded
 * direct CPO TenantPartner instead (FR/CPO calling FR/ZET via
 * ocpiCpoHeaders()), which is the established convention in the other
 * *Mapping.test.ts files in this repo.
 *
 * There is no separate hub/roaming curl script for Tokens, and — unlike
 * Tariffs/Cdrs — the Tokens receiver endpoints (PUT/PATCH/GET/authorize)
 * never look up or persist a RoamingPartner: TokensModuleApi.putToken calls
 * tokensService.upsertToken() without a roamingPartnerId, and the existence
 * check (GET_AUTHORIZATION_BY_TOKEN) keys only on idToken + idTokenType +
 * tenantPartnerId — never on RoamingPartner or on country_code/party_id in
 * the body. So two different roaming partners forwarded through the same
 * hub TenantPartner with the same token uid+type would collide/overwrite
 * each other, and the GET-by-country/party lookup (READ_AUTHORIZATION)
 * joins on TenantPartner, not RoamingPartner, which would not resolve a
 * hub-forwarded token back out again. Per the task instructions, since the
 * script itself has no hub scenario, this suite does not fabricate one and
 * only exercises the direct-CPO path the script actually covers.
 *
 * Tokens has no DELETE route (see 03_Modules/Tokens/src/module/TokensModuleApi.ts),
 * so — as with CDRs — there is no afterEach cleanup. PUT is an upsert keyed
 * on uid+type+tenantPartnerId, so re-running this suite would just update
 * the same rows in place; nonetheless a per-run suffix is used on token
 * uids to keep "unknown token" 404 assertions from ever colliding with a
 * uid a previous run might have left behind.
 */

import { describe, expect, it } from '@jest/globals';
import { randomUUID } from 'crypto';
import {
  http,
  ocpiCpoHeaders,
  graphqlQuery,
} from '../../../../Tests/helpers/ocpi-client.js';

const OCPI_BASE = process.env.OCPI_BASE ?? 'http://localhost:8085/ocpi';
const OCPI_VERSION = process.env.OCPI_VERSION ?? '2.2.1';
const TOKENS_RECEIVER_URL = `${OCPI_BASE}/emsp/${OCPI_VERSION}/tokens`;
const TOKENS_SENDER_URL = `${OCPI_BASE}/cpo/${OCPI_VERSION}/tokens`;

const CPO_COUNTRY = 'FR';
const CPO_PARTY = 'CPO';

// Unique per test-run so "unknown token" 404 checks never collide with a
// uid left behind by a previous run (Tokens cannot be deleted).
const RUN_ID = randomUUID().slice(0, 8);

const RFID_UID = `RFID001-${RUN_ID}`;
const APP_UID = `APP001-${RUN_ID}`;
const ADHOC_UID = `ADHOC001-${RUN_ID}`;
const UNKNOWN_UID = `UNKNOWN-${RUN_ID}`;

const RFID_TOKEN = {
  country_code: CPO_COUNTRY,
  party_id: CPO_PARTY,
  uid: RFID_UID,
  type: 'RFID',
  contract_id: 'FRCPO000001',
  visual_number: 'CPO-RFID-001',
  issuer: 'TotalEnergies',
  group_id: null,
  valid: true,
  whitelist: 'ALWAYS',
  language: 'fr',
  last_updated: '2024-07-10T18:00:00.000Z',
};

const APP_TOKEN = {
  country_code: CPO_COUNTRY,
  party_id: CPO_PARTY,
  uid: APP_UID,
  type: 'APP_USER',
  contract_id: 'FRCPO000002',
  visual_number: 'CPO-APP-001',
  issuer: 'TotalEnergies',
  valid: true,
  whitelist: 'NEVER',
  language: 'en',
  last_updated: '2024-07-10T19:00:00.000Z',
};

const ADHOC_TOKEN = {
  country_code: CPO_COUNTRY,
  party_id: CPO_PARTY,
  uid: ADHOC_UID,
  type: 'AD_HOC_USER',
  contract_id: 'FRCPO000003',
  visual_number: 'CPO-ADHOC-001',
  issuer: 'TotalEnergies',
  valid: true,
  whitelist: 'NEVER',
  last_updated: '2024-07-10T20:00:00.000Z',
};

function putToken(
  token: { uid: string; type: string } & Record<string, unknown>,
  useTypeQueryParam = false,
) {
  const url = useTypeQueryParam
    ? `${TOKENS_RECEIVER_URL}/${CPO_COUNTRY}/${CPO_PARTY}/${token.uid}?type=${token.type}`
    : `${TOKENS_RECEIVER_URL}/${CPO_COUNTRY}/${CPO_PARTY}/${token.uid}`;
  return http.put(url, token, { headers: ocpiCpoHeaders() });
}

function getToken(uid: string, type?: string) {
  return http.get(`${TOKENS_RECEIVER_URL}/${CPO_COUNTRY}/${CPO_PARTY}/${uid}`, {
    headers: ocpiCpoHeaders(),
    params: type ? { type } : undefined,
  });
}

function patchToken(uid: string, body: Record<string, unknown>, type?: string) {
  return http.patch(
    `${TOKENS_RECEIVER_URL}/${CPO_COUNTRY}/${CPO_PARTY}/${uid}`,
    body,
    { headers: ocpiCpoHeaders(), params: type ? { type } : undefined },
  );
}

function authorizeToken(
  uid: string,
  body?: Record<string, unknown>,
  type?: string,
) {
  return http.post(`${TOKENS_SENDER_URL}/${uid}/authorize`, body ?? {}, {
    headers: ocpiCpoHeaders(),
    params: type ? { type } : undefined,
  });
}

describe('PUT + GET token round trip (direct CPO)', () => {
  it('creates an RFID token (whitelist ALWAYS) and echoes matching data on GET', async () => {
    const putResp = await putToken(RFID_TOKEN);
    expect(putResp.status).toBe(200);
    expect(putResp.data.status_code).toBe(1000);

    const getResp = await getToken(RFID_UID);
    expect(getResp.status).toBe(200);
    const stored = getResp.data.data;

    expect(stored.country_code).toBe(CPO_COUNTRY);
    expect(stored.party_id).toBe(CPO_PARTY);
    expect(stored.uid).toBe(RFID_UID);
    expect(stored.type).toBe('RFID');
    expect(stored.contract_id).toBe(RFID_TOKEN.contract_id);
    expect(stored.visual_number).toBe(RFID_TOKEN.visual_number);
    expect(stored.issuer).toBe(RFID_TOKEN.issuer);
    expect(stored.valid).toBe(true);
    expect(stored.whitelist).toBe('ALWAYS');
    expect(stored.language).toBe('fr');
  });

  it('creates an APP_USER token (whitelist NEVER) via the ?type= query param', async () => {
    const putResp = await putToken(APP_TOKEN, true);
    expect(putResp.status).toBe(200);
    expect(putResp.data.status_code).toBe(1000);

    const getResp = await getToken(APP_UID, 'APP_USER');
    expect(getResp.status).toBe(200);
    const stored = getResp.data.data;

    expect(stored.uid).toBe(APP_UID);
    expect(stored.type).toBe('APP_USER');
    expect(stored.whitelist).toBe('NEVER');
    expect(stored.language).toBe('en');
  });

  it('creates an AD_HOC_USER token (whitelist NEVER) via the ?type= query param', async () => {
    const putResp = await putToken(ADHOC_TOKEN, true);
    expect(putResp.status).toBe(200);
    expect(putResp.data.status_code).toBe(1000);

    const getResp = await getToken(ADHOC_UID, 'AD_HOC_USER');
    expect(getResp.status).toBe(200);
    const stored = getResp.data.data;

    expect(stored.uid).toBe(ADHOC_UID);
    expect(stored.type).toBe('AD_HOC_USER');
    expect(stored.whitelist).toBe('NEVER');
  });

  it('maps and stores the RFID token correctly in the DB (bypassing the API)', async () => {
    await putToken(RFID_TOKEN);

    const result = await graphqlQuery<{
      Authorizations: {
        idToken: string;
        idTokenType: string;
        status: string;
        TenantPartner: { countryCode: string; partyId: string };
      }[];
    }>(
      `query ($idToken: citext!) {
        Authorizations(where: { idToken: { _eq: $idToken } }) {
          idToken
          idTokenType
          status
          TenantPartner { countryCode partyId }
        }
      }`,
      { idToken: RFID_UID },
    );

    expect(result.Authorizations).toHaveLength(1);
    const [row] = result.Authorizations;
    expect(row.idTokenType).toBe('ISO14443'); // RFID -> ISO14443
    expect(row.status).toBe('Accepted');
    expect(row.TenantPartner.countryCode).toBe(CPO_COUNTRY);
    expect(row.TenantPartner.partyId).toBe(CPO_PARTY);
  });
});

describe('error paths', () => {
  it('returns 404 for a non-existent token', async () => {
    const resp = await getToken(UNKNOWN_UID);
    expect(resp.status).toBe(404);
  });

  it('returns 404 when patching a non-existent token', async () => {
    const resp = await patchToken(UNKNOWN_UID, {
      valid: false,
      last_updated: '2024-08-15T12:00:00.000Z',
    });
    expect(resp.status).toBe(404);
  });

  it('returns 404 when authorizing a non-existent token', async () => {
    const resp = await authorizeToken(UNKNOWN_UID);
    expect(resp.status).toBe(404);
  });
});

describe('sender list + pagination', () => {
  // The Sender GET returns our OWN tokens (tenantPartnerId IS NULL),
  // filtered by Tenant (to-headers = our eMSP identity FR/ZET). Tokens
  // pushed by the CPO partner in the PUT tests above have tenantPartnerId
  // set, so they are excluded from this endpoint (same pattern as
  // Tariffs). These tests validate that the endpoint responds correctly;
  // the returned list is not expected to contain the fixtures above.
  it('lists own tokens and responds to pagination params', async () => {
    const listResp = await http.get(TOKENS_SENDER_URL, {
      headers: ocpiCpoHeaders(),
    });
    expect(listResp.status).toBe(200);

    const page1 = await http.get(TOKENS_SENDER_URL, {
      headers: ocpiCpoHeaders(),
      params: { limit: 1, offset: 0 },
    });
    const page2 = await http.get(TOKENS_SENDER_URL, {
      headers: ocpiCpoHeaders(),
      params: { limit: 1, offset: 1 },
    });
    expect(page1.status).toBe(200);
    expect(page2.status).toBe(200);
  });

  it('responds to the date_from filter', async () => {
    const resp = await http.get(TOKENS_SENDER_URL, {
      headers: ocpiCpoHeaders(),
      params: { date_from: '2024-07-10T19:00:00Z' },
    });
    expect(resp.status).toBe(200);
  });
});

describe('update (PUT + PATCH)', () => {
  it('updates the RFID token on repeated PUT and reflects the change on GET', async () => {
    await putToken(RFID_TOKEN);

    // energy_contract is accepted by TokenDTOSchema but TokensMapper does
    // not persist it (see the commented-out field in TokensMapper.toDto) —
    // included here to match the original curl script's payload and to
    // confirm the field is silently dropped rather than rejected.
    const updated = {
      ...RFID_TOKEN,
      whitelist: 'ALLOWED',
      energy_contract: {
        supplier_name: 'EDF',
        contract_id: 'EDF-12345',
      },
      last_updated: '2024-08-01T10:00:00.000Z',
    };
    const putResp = await putToken(updated);
    expect(putResp.status).toBe(200);

    const getResp = await getToken(RFID_UID);
    expect(getResp.status).toBe(200);
    expect(getResp.data.data.whitelist).toBe('ALLOWED');
    expect(getResp.data.data.energy_contract).toBeUndefined();
  });

  it('invalidates the RFID token via PATCH and reflects it on GET', async () => {
    await putToken(RFID_TOKEN);

    const patchResp = await patchToken(RFID_UID, {
      valid: false,
      last_updated: '2024-08-15T12:00:00.000Z',
    });
    expect(patchResp.status).toBe(200);
    expect(patchResp.data.status_code).toBe(1000);

    const getResp = await getToken(RFID_UID);
    expect(getResp.status).toBe(200);
    expect(getResp.data.data.valid).toBe(false);

    // Revalidate so this token is left in a known-good state, mirroring
    // the cleanup phase of the original curl script.
    const revalidate = await patchToken(RFID_UID, {
      valid: true,
      last_updated: '2024-09-01T00:00:00.000Z',
    });
    expect(revalidate.status).toBe(200);

    const getAfterRevalidate = await getToken(RFID_UID);
    expect(getAfterRevalidate.data.data.valid).toBe(true);
  });
});

describe('authorize (Sender POST)', () => {
  it('authorizes a valid RFID token with no body', async () => {
    await putToken(RFID_TOKEN);

    const resp = await authorizeToken(RFID_UID);
    expect(resp.status).toBe(200);
    expect(resp.data.data.allowed).toBe('ALLOWED');
    expect(resp.data.data.token.uid).toBe(RFID_UID);
  });

  it('authorizes a valid APP_USER token via the ?type= query param', async () => {
    await putToken(APP_TOKEN, true);

    const resp = await authorizeToken(APP_UID, undefined, 'APP_USER');
    expect(resp.status).toBe(200);
    expect(resp.data.data.token.uid).toBe(APP_UID);
  });

  it('authorizes with LocationReferences and echoes them back', async () => {
    await putToken(RFID_TOKEN);

    const resp = await authorizeToken(RFID_UID, {
      location_id: 'LOC001',
      evse_uids: ['EVSE001', 'EVSE002'],
    });
    expect(resp.status).toBe(200);
    expect(resp.data.data.location).toEqual({
      location_id: 'LOC001',
      evse_uids: ['EVSE001', 'EVSE002'],
    });
  });
});
