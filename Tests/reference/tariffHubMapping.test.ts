// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

/**
 * Tariffs through the Gireve hub.
 *
 * Scenario:
 *   - Our platform acts as eMSP: FR/ZET (the Tenant)
 *   - Hub (TenantPartner): FR/107 (Gireve preprod), authenticated with HUB_AUTH_TOKEN.
 *     e2eGlobalSetup also configures FR/107 as the Gireve identity, so isGirevePartner()
 *     is true for it.
 *   - Roaming CPO A (RoamingPartner under the hub): FR/CPO
 *   - Roaming CPO B (RoamingPartner under the hub): FR/BTU
 *
 * Requests arrive with the hub's credentials token and OCPI-from set to the roaming CPO
 * behind the hub (OCPI 2.2.1 §4.1.8.6, "Party to Party via Hub"). The country_code /
 * party_id in the URL and body identify that CPO.
 *
 * Both roaming CPOs push a tariff with the SAME id. We verify:
 *   1. Both tariffs are created independently (no collision on the shared id)
 *   2. Updating CPO A's tariff does NOT affect CPO B's tariff
 *   3. TariffElements are replaced (not accumulated) on repeated PUTs
 *   4. Deleting CPO A's tariff does NOT affect CPO B's tariff
 *   5. Rows are owned by the hub TenantPartner + the right RoamingPartner
 *   6. Our sender list, pulled by the hub, never echoes hub-forwarded tariffs back
 */

import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'crypto';
import {
  HUB,
  RECEIVER_URL,
  SENDER_URL,
  graphqlQuery,
  http,
  ocpiHubHeaders,
} from '../helpers/ocpi-client';

type Cpo = { countryCode: string; partyId: string };

const SHARED_ID = 'TARIFF-SHARED-ID';
const CPO_A: Cpo = { countryCode: 'FR', partyId: 'CPO' };
const CPO_B: Cpo = { countryCode: 'FR', partyId: 'BTU' };

function hubUrl(cpo: Cpo, id: string) {
  return `${RECEIVER_URL}/${cpo.countryCode}/${cpo.partyId}/${id}`;
}

function putHubTariff(cpo: Cpo, body: unknown, id = SHARED_ID) {
  return http.put(hubUrl(cpo, id), body, {
    headers: ocpiHubHeaders(cpo.partyId, cpo.countryCode),
  });
}

function getHubTariff(cpo: Cpo, id = SHARED_ID) {
  return http.get(hubUrl(cpo, id), {
    headers: ocpiHubHeaders(cpo.partyId, cpo.countryCode),
  });
}

async function deleteHubTariff(cpo: Cpo, id = SHARED_ID) {
  const resp = await http.delete(hubUrl(cpo, id), {
    headers: ocpiHubHeaders(cpo.partyId, cpo.countryCode),
  });
  // 200 = deleted, 404 = already absent: both fine for cleanup.
  if (resp.status !== 200 && resp.status !== 404) {
    console.warn(
      `cleanup DELETE hub ${cpo.countryCode}/${cpo.partyId}/${id}: ${resp.status}`,
      resp.data,
    );
  }
  return resp;
}

const tariffACreate = {
  id: SHARED_ID,
  country_code: CPO_A.countryCode,
  party_id: CPO_A.partyId,
  currency: 'EUR',
  type: 'REGULAR',
  tariff_alt_text: [
    { language: 'fr', text: 'Tarif CPO France - energie uniquement' },
    { language: 'en', text: 'French CPO tariff - energy only' },
  ],
  elements: [
    {
      price_components: [
        { type: 'ENERGY', price: 0.25, vat: 20.0, step_size: 1 },
      ],
    },
  ],
  start_date_time: '2026-01-01T00:00:00Z',
  last_updated: '2026-01-01T00:00:00Z',
};

const tariffBCreate = {
  id: SHARED_ID,
  country_code: CPO_B.countryCode,
  party_id: CPO_B.partyId,
  currency: 'EUR',
  type: 'REGULAR',
  tariff_alt_text: [
    { language: 'fr', text: 'Tarif BTU - temps et energie' },
    { language: 'en', text: 'BTU tariff - time and energy' },
  ],
  elements: [
    {
      price_components: [
        { type: 'ENERGY', price: 0.3, vat: 20.0, step_size: 1 },
        { type: 'TIME', price: 2.0, vat: 20.0, step_size: 60 },
      ],
    },
  ],
  start_date_time: '2026-01-01T00:00:00Z',
  last_updated: '2026-01-01T00:00:00Z',
};

const tariffAUpdate = {
  ...tariffACreate,
  tariff_alt_text: [
    {
      language: 'fr',
      text: 'Tarif CPO France - mis a jour avec frais de depart',
    },
    { language: 'en', text: 'French CPO tariff - updated with start fee' },
  ],
  max_price: { excl_vat: 20.0, incl_vat: 24.0 },
  elements: [
    {
      price_components: [
        { type: 'FLAT', price: 1.0, vat: 20.0, step_size: 1 },
        { type: 'ENERGY', price: 0.28, vat: 20.0, step_size: 1 },
      ],
    },
  ],
  last_updated: '2026-06-01T00:00:00Z',
};

// Always clean up both roaming CPOs' shared-id tariff, even mid-failure.
afterEach(async () => {
  await deleteHubTariff(CPO_A);
  await deleteHubTariff(CPO_B);
});

describe('receiver: two roaming CPOs behind the hub', () => {
  it('creates tariffs independently for two roaming CPOs sharing the same id', async () => {
    const putA = await putHubTariff(CPO_A, tariffACreate);
    expect(putA.status).toBe(200);
    expect(putA.data.status_code).toBe(1000);

    const putB = await putHubTariff(CPO_B, tariffBCreate);
    expect(putB.status).toBe(200);
    expect(putB.data.status_code).toBe(1000);

    const getA = await getHubTariff(CPO_A);
    expect(getA.status).toBe(200);
    expect(getA.data.data).toMatchObject({
      id: SHARED_ID,
      country_code: 'FR',
      party_id: 'CPO',
      currency: 'EUR',
    });
    expect(getA.data.data.elements[0].price_components).toHaveLength(1); // ENERGY

    const getB = await getHubTariff(CPO_B);
    expect(getB.status).toBe(200);
    expect(getB.data.data).toMatchObject({
      id: SHARED_ID,
      country_code: 'FR',
      party_id: 'BTU',
    });
    expect(getB.data.data.elements[0].price_components).toHaveLength(2); // ENERGY + TIME
  });

  it("isolates updates: updating CPO A's tariff does not affect CPO B's tariff", async () => {
    await putHubTariff(CPO_A, tariffACreate);
    await putHubTariff(CPO_B, tariffBCreate);

    const updateResp = await putHubTariff(CPO_A, tariffAUpdate);
    expect(updateResp.status).toBe(200);

    const getA = await getHubTariff(CPO_A);
    expect(getA.data.data.elements[0].price_components).toHaveLength(2); // FLAT + ENERGY
    expect(getA.data.data.max_price.excl_vat).toBeCloseTo(20.0);
    expect(getA.data.data.max_price.incl_vat).toBeCloseTo(24.0);
    const aEnergy = getA.data.data.elements[0].price_components.find(
      (c: { type: string }) => c.type === 'ENERGY',
    );
    expect(aEnergy.price).toBeCloseTo(0.28);

    const getB = await getHubTariff(CPO_B);
    expect(getB.data.data.elements[0].price_components).toHaveLength(2); // still ENERGY + TIME
    const bEnergy = getB.data.data.elements[0].price_components.find(
      (c: { type: string }) => c.type === 'ENERGY',
    );
    expect(bEnergy.price).toBeCloseTo(0.3);
  });

  it('replaces TariffElements on repeated PUTs instead of accumulating them', async () => {
    await putHubTariff(CPO_A, tariffACreate);
    await putHubTariff(CPO_A, tariffAUpdate);

    const repeat = await putHubTariff(CPO_A, tariffAUpdate);
    expect(repeat.status).toBe(200);

    const getA = await getHubTariff(CPO_A);
    expect(getA.data.data.elements).toHaveLength(1);
    expect(getA.data.data.elements[0].price_components).toHaveLength(2);
  });

  it("deletes CPO A's tariff without affecting CPO B's tariff", async () => {
    await putHubTariff(CPO_A, tariffACreate);
    await putHubTariff(CPO_B, tariffBCreate);

    const del = await deleteHubTariff(CPO_A);
    expect(del.status).toBe(200);

    const getADeleted = await getHubTariff(CPO_A);
    expect(getADeleted.status).toBe(404);

    const getBStillThere = await getHubTariff(CPO_B);
    expect(getBStillThere.status).toBe(200);
    expect(getBStillThere.data.data.party_id).toBe('BTU');
  });

  it('returns 404 for a tariff id unknown to that roaming CPO', async () => {
    await putHubTariff(CPO_A, tariffACreate);

    // Same id exists for CPO A: CPO B's namespace must not resolve to it.
    const resp = await getHubTariff(CPO_B);
    expect(resp.status).toBe(404);
  });

  it('maps hub-forwarded tariffs to the hub TenantPartner and the right RoamingPartner', async () => {
    await putHubTariff(CPO_A, tariffACreate);
    await putHubTariff(CPO_B, tariffBCreate);

    const result = await graphqlQuery<{
      Tariffs: {
        ocpiTariffId: string;
        TenantPartner: { countryCode: string; partyId: string };
        RoamingPartner: { countryCode: string; partyId: string };
      }[];
    }>(
      `query ($ocpiTariffId: String!) {
        Tariffs(where: { ocpiTariffId: { _eq: $ocpiTariffId } }) {
          ocpiTariffId
          TenantPartner { countryCode partyId }
          RoamingPartner { countryCode partyId }
        }
      }`,
      { ocpiTariffId: SHARED_ID },
    );

    expect(result.Tariffs).toHaveLength(2);
    for (const row of result.Tariffs) {
      expect(row.TenantPartner).toEqual({
        countryCode: HUB.countryCode,
        partyId: HUB.partyId,
      });
    }
    const pairs = result.Tariffs.map(
      (r) => `${r.RoamingPartner.countryCode}/${r.RoamingPartner.partyId}`,
    );
    expect(pairs.sort()).toEqual(['FR/BTU', 'FR/CPO']);
  });
});

describe('sender: the hub pulls our tariffs', () => {
  const OWN_ID = `OWN-HUB-${randomUUID().slice(0, 8)}`;

  beforeAll(async () => {
    // An own tariff (tenant FR/ZET, no TenantPartner) so the list is not empty.
    await graphqlQuery(
      `mutation ($objects: [Tariffs_insert_input!]!) {
        insert_Tariffs(objects: $objects) { affected_rows }
      }`,
      {
        objects: [
          {
            tenantId: 1,
            currency: 'EUR',
            ocpiTariffId: OWN_ID,
            startDateTime: '2025-01-01T00:00:00Z',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            TariffElements: {
              data: [
                {
                  priceComponents: [
                    { type: 'ENERGY', price: 0.35, step_size: 1 },
                  ],
                  createdAt: '2025-01-01T00:00:00Z',
                  updatedAt: '2025-01-01T00:00:00Z',
                },
              ],
            },
          },
        ],
      },
    );
  });

  it('lists our own tariffs and never echoes hub-forwarded ones back to the hub', async () => {
    await putHubTariff(CPO_A, tariffACreate);

    // GET All via Hubs (§4.1.8.7): OCPI-from is the hub itself.
    const resp = await http.get(SENDER_URL, {
      headers: ocpiHubHeaders(),
      params: { limit: 100 },
    });
    expect(resp.status).toBe(200);
    expect(resp.data.status_code).toBe(1000);

    const tariffs: { id: string; country_code: string; party_id: string }[] =
      resp.data.data;
    expect(tariffs.map((t) => t.id)).toContain(OWN_ID);
    for (const t of tariffs) {
      expect(`${t.country_code}/${t.party_id}`).toBe('FR/ZET');
    }
  });
});
