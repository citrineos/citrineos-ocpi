// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

/**
 * CDRs module OCPI 2.2.1 - eMSP Receiver — Hub / Roaming Partner isolation tests.
 *
 * Converted from Tests/cdrs-hub-test-curls.sh.
 *
 * Topology (mirrors tariffEHUBMapping.test.ts):
 *   - Our platform acts as eMSP (the Tenant).
 *   - Hub (TenantPartner): FR/123, authenticated with HUB_AUTH_TOKEN.
 *   - Roaming CPO A (RoamingPartner under the hub): FR/CPO.
 *   - Roaming CPO B (RoamingPartner under the hub): FR/BTU.
 *
 * NOTE: the original bash script used FR*CPO / DE*EVP as the two roaming
 * partners. The seeded test DB (seeders/20260803171237-default-roaming-partner.ts)
 * only configures FR/CPO and FR/BTU under the FR/123 hub tenant partner, so
 * this suite exercises isolation between those two instead — the scenario
 * (two roaming partners posting a CDR with the same OCPI id) is identical.
 *
 * The hub forwards CDRs to our eMSP endpoint. Roaming partner identity is
 * resolved from the OCPI-from-country-code / OCPI-from-party-id headers
 * (see AuthMiddleware), not from the request body or URL — so isolation is
 * driven by using distinct headers per roaming CPO, exactly like the hub
 * test for Tariffs.
 *
 * CDRs are immutable: there is no PUT/PATCH/DELETE route, only POST (create)
 * and GET (by id, keyed off the internal numeric row id returned in the
 * Location header — not the OCPI string id, which may collide across
 * roaming partners).
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
const CDR_RECEIVER_URL = `${OCPI_BASE}/emsp/${OCPI_VERSION}/cdrs`;

type Cpo = { countryCode: string; partyId: string };

const CPO_A: Cpo = { countryCode: 'FR', partyId: 'CPO' };
const CPO_B: Cpo = { countryCode: 'FR', partyId: 'BTU' };

// Unique per test-run so re-running this suite never collides with CDRs
// left behind by a previous run (CDRs cannot be deleted).
const RUN_ID = randomUUID().slice(0, 8);

function hubHeaders(cpo: Cpo) {
  return ocpiHubHeaders(cpo.partyId, cpo.countryCode);
}

async function postCdr(cpo: Cpo, body: unknown) {
  return http.post(CDR_RECEIVER_URL, body, { headers: hubHeaders(cpo) });
}

async function getCdr(cpo: Cpo, location: string) {
  return http.get(location, { headers: hubHeaders(cpo) });
}

function locationOf(resp: { headers: Record<string, unknown> }): string {
  const location = resp.headers['location'];
  if (typeof location !== 'string') {
    throw new Error('Expected Location header on CDR POST response');
  }
  return location;
}

function baseCdr(
  cpo: Cpo,
  id: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    country_code: cpo.countryCode,
    party_id: cpo.partyId,
    id,
    start_date_time: '2025-03-10T08:00:00Z',
    end_date_time: '2025-03-10T09:00:00Z',
    session_id: `SESSION-${id}`,
    cdr_token: {
      country_code: cpo.countryCode,
      party_id: 'MSP',
      uid: `RFID-${id}`,
      type: 'RFID',
      contract_id: `CONTRACT-${id}`,
    },
    auth_method: 'WHITELIST',
    cdr_location: {
      id: `LOC-${id}`,
      address: '1 Rue de Rivoli',
      city: 'Paris',
      country: 'FRA',
      coordinates: { latitude: '48.860611', longitude: '2.337644' },
      evse_uid: `EVSE-${id}`,
      evse_id: `${cpo.countryCode}*${cpo.partyId}*E001`,
      connector_id: '1',
      connector_standard: 'IEC_62196_T2',
      connector_format: 'SOCKET',
      connector_power_type: 'AC_3_PHASE',
    },
    currency: 'EUR',
    tariffs: [
      {
        country_code: cpo.countryCode,
        party_id: cpo.partyId,
        id: `TARIFF-${id}`,
        currency: 'EUR',
        elements: [
          {
            price_components: [
              { type: 'ENERGY', price: 0.28, vat: 20.0, step_size: 1 },
            ],
          },
        ],
        last_updated: '2025-01-01T00:00:00Z',
      },
    ],
    charging_periods: [
      {
        start_date_time: '2025-03-10T08:00:00Z',
        dimensions: [{ type: 'ENERGY', volume: 15.0 }],
        tariff_id: `TARIFF-${id}`,
      },
    ],
    total_cost: { excl_vat: 4.2, incl_vat: 5.04 },
    total_energy: 15.0,
    total_time: 1.0,
    last_updated: '2025-03-10T09:05:00Z',
    ...overrides,
  };
}

function creditCdr(cpo: Cpo, id: string, creditOf: string) {
  return baseCdr(cpo, id, {
    total_cost: { excl_vat: -4.2, incl_vat: -5.04 },
    credit: true,
    credit_reference_id: creditOf,
    last_updated: '2025-03-15T10:00:00Z',
  });
}

function multiPeriodCdr(cpo: Cpo, id: string) {
  return baseCdr(cpo, id, {
    charging_periods: [
      {
        start_date_time: '2025-06-01T16:00:00Z',
        dimensions: [
          { type: 'ENERGY', volume: 4.3 },
          { type: 'MAX_CURRENT', volume: 16.0 },
        ],
        tariff_id: `TARIFF-${id}`,
      },
      {
        start_date_time: '2025-06-01T17:00:00Z',
        dimensions: [{ type: 'ENERGY', volume: 1.1 }],
        tariff_id: `TARIFF-${id}`,
      },
      {
        start_date_time: '2025-06-01T17:30:00Z',
        dimensions: [{ type: 'PARKING_TIME', volume: 1.5 }],
        tariff_id: `TARIFF-${id}`,
      },
    ],
    total_energy: 5.4,
    total_time: 3.0,
    total_parking_time: 1.5,
    total_cost: { excl_vat: 1.157, incl_vat: 1.388 },
  });
}

function signedCdr(cpo: Cpo, id: string, verifyUrl: string) {
  return baseCdr(cpo, id, {
    signed_data: {
      encoding_method: 'OCMF',
      encoding_method_version: 1,
      public_key: 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEfakePublicKey==',
      signed_values: [
        {
          nature: 'Start',
          plain_data: 'START|2025-07-01T09:00:00Z|0.000kWh',
          signed_data: 'c2lnbmVkX3N0YXJ0X2Zha2VfYmFzZTY0',
        },
        {
          nature: 'End',
          plain_data: 'END|2025-07-01T10:00:00Z|30.000kWh',
          signed_data: 'c2lnbmVkX2VuZF9mYWtlX2Jhc2U2NA==',
        },
      ],
      url: verifyUrl,
    },
  });
}

function missingTotalCostCdr(cpo: Cpo, id: string) {
  const cdr = baseCdr(cpo, id) as Record<string, unknown>;
  delete cdr.total_cost;
  return cdr;
}

describe('hub / roaming partner isolation', () => {
  it('creates CDRs independently for two roaming partners sharing the same OCPI id', async () => {
    const sharedId = `CDR-SHARED-${RUN_ID}`;

    const postA = await postCdr(CPO_A, baseCdr(CPO_A, sharedId));
    expect(postA.status).toBe(200);
    expect(postA.data.status_code).toBe(1000);
    const locationA = locationOf(postA);

    const postB = await postCdr(CPO_B, baseCdr(CPO_B, sharedId));
    expect(postB.status).toBe(200);
    expect(postB.data.status_code).toBe(1000);
    const locationB = locationOf(postB);

    expect(locationA).not.toBe(locationB);

    const getA = await getCdr(CPO_A, locationA);
    expect(getA.status).toBe(200);
    expect(getA.data.data.country_code).toBe('FR');
    expect(getA.data.data.party_id).toBe('CPO');
    expect(getA.data.data.id).toBe(sharedId);
    expect(getA.data.data.cdr_location.evse_id).toBe('FR*CPO*E001');

    const getB = await getCdr(CPO_B, locationB);
    expect(getB.status).toBe(200);
    expect(getB.data.data.country_code).toBe('FR');
    expect(getB.data.data.party_id).toBe('BTU');
    expect(getB.data.data.id).toBe(sharedId);
    expect(getB.data.data.cdr_location.evse_id).toBe('FR*BTU*E001');
  });

  it('full field validation for a roaming CPO CDR', async () => {
    const id = `CDR-FIELDS-${RUN_ID}`;
    const post = await postCdr(CPO_A, baseCdr(CPO_A, id));
    expect(post.status).toBe(200);

    const get = await getCdr(CPO_A, locationOf(post));
    expect(get.status).toBe(200);
    const data = get.data.data;

    expect(data.auth_method).toBe('WHITELIST');
    expect(data.currency).toBe('EUR');
    expect(data.cdr_token.country_code).toBe('FR');
    expect(data.cdr_token.type).toBe('RFID');
    expect(data.cdr_location.address).toBe('1 Rue de Rivoli');
    expect(data.cdr_location.connector_power_type).toBe('AC_3_PHASE');
    expect(data.tariffs).toHaveLength(1);
    expect(data.tariffs[0].elements[0].price_components[0].price).toBeCloseTo(
      0.28,
    );
    expect(data.charging_periods).toHaveLength(1);
    expect(data.charging_periods[0].dimensions[0].volume).toBeCloseTo(15.0);
    expect(data.total_energy).toBeCloseTo(15.0);
    expect(data.total_cost.excl_vat).toBeCloseTo(4.2);
    expect(data.total_cost.incl_vat).toBeCloseTo(5.04);
    expect(data.credit ?? null).toBeNull();
    expect(data.last_updated).toBeTruthy();
  });

  it('rejects a duplicate CDR id per roaming partner with an OCPI error', async () => {
    const id = `CDR-DUP-${RUN_ID}`;

    const firstA = await postCdr(CPO_A, baseCdr(CPO_A, id));
    expect(firstA.status).toBe(200);
    const dupA = await postCdr(CPO_A, baseCdr(CPO_A, id));
    expect(dupA.data.status_code).not.toBe(1000);

    const firstB = await postCdr(CPO_B, baseCdr(CPO_B, id));
    expect(firstB.status).toBe(200);
    const dupB = await postCdr(CPO_B, baseCdr(CPO_B, id));
    expect(dupB.data.status_code).not.toBe(1000);
  });

  it('isolates credit CDRs between roaming partners sharing the same original id', async () => {
    const originalId = `CDR-CREDIT-ORIG-${RUN_ID}`;
    const creditId = `CDR-CREDIT-${RUN_ID}`;

    const creditA = await postCdr(
      CPO_A,
      creditCdr(CPO_A, creditId, originalId),
    );
    expect(creditA.status).toBe(200);
    const creditB = await postCdr(
      CPO_B,
      creditCdr(CPO_B, creditId, originalId),
    );
    expect(creditB.status).toBe(200);

    const getA = await getCdr(CPO_A, locationOf(creditA));
    expect(getA.data.data.credit).toBe(true);
    expect(getA.data.data.credit_reference_id).toBe(originalId);
    expect(getA.data.data.total_cost.excl_vat).toBeCloseTo(-4.2);

    const getB = await getCdr(CPO_B, locationOf(creditB));
    expect(getB.data.data.credit).toBe(true);
    expect(getB.data.data.credit_reference_id).toBe(originalId);
    expect(getB.data.data.party_id).toBe('BTU');
  });

  it('stores all charging periods for a multi-period CDR without cross-partner bleed', async () => {
    const id = `CDR-MULTI-${RUN_ID}`;

    const postA = await postCdr(CPO_A, multiPeriodCdr(CPO_A, id));
    expect(postA.status).toBe(200);
    const postB = await postCdr(CPO_B, multiPeriodCdr(CPO_B, id));
    expect(postB.status).toBe(200);

    const getA = await getCdr(CPO_A, locationOf(postA));
    expect(getA.data.data.charging_periods).toHaveLength(3);
    expect(getA.data.data.charging_periods[0].dimensions[1].type).toBe(
      'MAX_CURRENT',
    );
    expect(getA.data.data.charging_periods[2].dimensions[0].type).toBe(
      'PARKING_TIME',
    );
    expect(getA.data.data.total_parking_time).toBeCloseTo(1.5);
    expect(getA.data.data.party_id).toBe('CPO');

    const getB = await getCdr(CPO_B, locationOf(postB));
    expect(getB.data.data.charging_periods).toHaveLength(3);
    expect(getB.data.data.party_id).toBe('BTU');
  });

  it('preserves signed_data independently per roaming partner', async () => {
    const id = `CDR-SIGNED-${RUN_ID}`;

    const postA = await postCdr(
      CPO_A,
      signedCdr(CPO_A, id, `https://verify.example.com/CPO/${id}`),
    );
    expect(postA.status).toBe(200);
    const postB = await postCdr(
      CPO_B,
      signedCdr(CPO_B, id, `https://verify.example.com/BTU/${id}`),
    );
    expect(postB.status).toBe(200);

    const getA = await getCdr(CPO_A, locationOf(postA));
    expect(getA.data.data.signed_data.encoding_method).toBe('OCMF');
    expect(getA.data.data.signed_data.url).toBe(
      `https://verify.example.com/CPO/${id}`,
    );
    expect(getA.data.data.signed_data.signed_values).toHaveLength(2);

    const getB = await getCdr(CPO_B, locationOf(postB));
    expect(getB.data.data.signed_data.url).toBe(
      `https://verify.example.com/BTU/${id}`,
    );
  });

  it('rejects a CDR missing the required total_cost field for both roaming partners', async () => {
    const respA = await postCdr(
      CPO_A,
      missingTotalCostCdr(CPO_A, `CDR-MISSING-A-${RUN_ID}`),
    );
    expect(respA.data.status_code).not.toBe(1000);

    const respB = await postCdr(
      CPO_B,
      missingTotalCostCdr(CPO_B, `CDR-MISSING-B-${RUN_ID}`),
    );
    expect(respB.data.status_code).not.toBe(1000);
  });

  it('rejects PUT/PATCH/DELETE on the CDR endpoint — CDRs are immutable', async () => {
    const id = `CDR-IMMUTABLE-${RUN_ID}`;
    const post = await postCdr(CPO_A, baseCdr(CPO_A, id));
    const location = locationOf(post);

    const put = await http.put(location, baseCdr(CPO_A, id), {
      headers: hubHeaders(CPO_A),
    });
    expect(put.status).toBe(405);

    const patch = await http.patch(
      location,
      { remark: 'patch attempt' },
      { headers: hubHeaders(CPO_A) },
    );
    expect(patch.status).toBe(405);

    const del = await http.delete(location, { headers: hubHeaders(CPO_A) });
    expect(del.status).toBe(405);
  });

  it('maps hub-forwarded CDRs to the correct RoamingPartner rows in the DB', async () => {
    const id = `CDR-DB-${RUN_ID}`;

    await postCdr(CPO_A, baseCdr(CPO_A, id));
    await postCdr(CPO_B, baseCdr(CPO_B, id));

    const result = await graphqlQuery<{
      Cdrs: {
        ocpiCdrId: string;
        currency: string;
        TenantPartner: { countryCode: string; partyId: string };
        RoamingPartner: { countryCode: string; partyId: string };
      }[];
    }>(
      `query ($ocpiCdrId: String!) {
        Cdrs(where: { ocpiCdrId: { _eq: $ocpiCdrId } }) {
          ocpiCdrId
          currency
          TenantPartner { countryCode partyId }
          RoamingPartner { countryCode partyId }
        }
      }`,
      { ocpiCdrId: id },
    );

    expect(result.Cdrs).toHaveLength(2);
    expect(result.Cdrs.every((c) => c.TenantPartner.partyId === '123')).toBe(
      true,
    );
    const pairs = result.Cdrs.map(
      (c) => `${c.RoamingPartner.countryCode}/${c.RoamingPartner.partyId}`,
    );
    expect(pairs).toEqual(expect.arrayContaining(['FR/CPO', 'FR/BTU']));
  });
});
