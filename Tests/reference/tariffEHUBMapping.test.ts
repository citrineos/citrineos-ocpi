// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

/**
 * Test our EMSP Endpoint for PUT/GET/DELETE tariffs. with a CPO partner.
 */

import { afterEach, describe, expect, it } from '@jest/globals';
import {
  RECEIVER_URL,
  SENDER_URL,
  http,
  ocpiCpoHeaders,
  graphqlQuery,
  ocpiHubHeaders,
} from '../../../../Tests/helpers/ocpi-client';

const CPO_COUNTRY = 'FR';
const CPO_PARTY = 'CPO';

const TARIFF_STD = {
  id: 'tariff-std-001',
  country_code: CPO_COUNTRY,
  party_id: CPO_PARTY,
  currency: 'EUR',
  type: 'REGULAR',
  elements: [
    {
      price_components: [
        { type: 'ENERGY', price: 0.25, vat: 0.2, step_size: 1 },
        { type: 'FLAT', price: 1.5, vat: 0.2, step_size: 1 },
      ],
    },
  ],
};

const TARIFF_UUID_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
const TARIFF_UUID = {
  id: TARIFF_UUID_ID,
  country_code: CPO_COUNTRY,
  party_id: CPO_PARTY,
  currency: 'EUR',
  tariff_alt_text: [
    { language: 'fr', text: 'Tarif heures creuses' },
    { language: 'en', text: 'Off-peak tariff' },
  ],
  elements: [
    {
      price_components: [
        { type: 'ENERGY', price: 0.18, vat: 0.2, step_size: 1 },
      ],
    },
  ],
};

const TARIFF_NUMERIC = {
  id: '42',
  country_code: CPO_COUNTRY,
  party_id: CPO_PARTY,
  currency: 'EUR',
  type: 'AD_HOC_PAYMENT',
  elements: [
    {
      price_components: [
        { type: 'ENERGY', price: 0.3, vat: 0.2, step_size: 1 },
        { type: 'TIME', price: 2.0, vat: 0.2, step_size: 60 },
      ],
    },
  ],
};

const ALL_TARIFFS = [TARIFF_STD, TARIFF_UUID, TARIFF_NUMERIC] as const;

async function putTariff(tariff: (typeof ALL_TARIFFS)[number]) {
  return http.put(
    `${RECEIVER_URL}/${CPO_COUNTRY}/${CPO_PARTY}/${tariff.id}`,
    tariff,
    {
      headers: ocpiCpoHeaders(),
    },
  );
}

async function getTariff(id: string) {
  return http.get(`${RECEIVER_URL}/${CPO_COUNTRY}/${CPO_PARTY}/${id}`, {
    headers: ocpiCpoHeaders(),
  });
}

async function deleteTariff(id: string) {
  const resp = await http.delete(
    `${RECEIVER_URL}/${CPO_COUNTRY}/${CPO_PARTY}/${id}`,
    { headers: ocpiCpoHeaders() },
  );
  // 200 = deleted, 404 = already absent — both OK for cleanup
  if (resp.status !== 200 && resp.status !== 404) {
    console.warn(`cleanup DELETE ${id}: ${resp.status}`, resp.data);
  }
  return resp;
}

// Always clean up, even if a test fails mid-way, so runs are independent.
afterEach(async () => {
  for (const tariff of ALL_TARIFFS) {
    await deleteTariff(tariff.id);
  }
});

describe.each(ALL_TARIFFS.map((t) => [t.id, t] as const))(
  'PUT + GET round trip: %s',
  (_id, tariff) => {
    it('creates the tariff and echoes matching data on GET', async () => {
      const putResp = await putTariff(tariff);
      expect(putResp.status).toBe(200);
      expect(putResp.data.status_code).toBe(1000); // OCPI success code

      const getResp = await getTariff(tariff.id);
      expect(getResp.status).toBe(200);
      const stored = getResp.data.data;

      expect(stored.currency).toBe(tariff.currency);
      expect(stored.elements).toHaveLength(tariff.elements.length);
      tariff.elements[0].price_components.forEach((expected, i) => {
        const actual = stored.elements[0].price_components[i];
        expect(actual.type).toBe(expected.type);
        expect(actual.price).toBeCloseTo(expected.price);
        expect(actual.vat).toBeCloseTo(expected.vat);
      });
    });

    it('maps and stores the tariff correctly in the DB (bypassing the API)', async () => {
      await putTariff(tariff);

      const result = await graphqlQuery<{
        Tariffs: {
          ocpiTariffId: string;
          currency: string;
          TenantPartner: { countryCode: string; partyId: string };
        }[];
      }>(
        `query ($ocpiTariffId: String!) {
          Tariffs(where: { ocpiTariffId: { _eq: $ocpiTariffId } }) {
            ocpiTariffId
            currency
            TenantPartner { countryCode partyId }
          }
        }`,
        { ocpiTariffId: tariff.id },
      );

      expect(result.Tariffs).toHaveLength(1);
      const [row] = result.Tariffs;
      expect(row.currency).toBe(tariff.currency);
      expect(row.TenantPartner.countryCode).toBe(CPO_COUNTRY);
      expect(row.TenantPartner.partyId).toBe(CPO_PARTY);
    });
  },
);

describe('error paths', () => {
  it('returns 404 for a non-existent tariff', async () => {
    const resp = await getTariff('non-existent-tariff-xyz');
    expect(resp.status).toBe(404);
  });

  it('returns 404 when deleting a non-existent tariff', async () => {
    const resp = await deleteTariff('non-existent-tariff-xyz');
    expect(resp.status).toBe(404);
  });
});

describe('sender list + pagination', () => {
  it('lists own tariffs and paginates distinctly across pages', async () => {
    const listResp = await http.get(SENDER_URL, { headers: ocpiCpoHeaders() });
    expect(listResp.status).toBe(200);

    const page1 = await http.get(SENDER_URL, {
      headers: ocpiCpoHeaders(),
      params: { limit: 1, offset: 0 },
    });
    const page2 = await http.get(SENDER_URL, {
      headers: ocpiCpoHeaders(),
      params: { limit: 1, offset: 1 },
    });
    expect(page1.status).toBe(200);
    expect(page2.status).toBe(200);
    expect(page1.data.data).not.toEqual(page2.data.data);
  });
});

describe('update', () => {
  it('adds a new price component on update and reflects it on GET', async () => {
    await putTariff(TARIFF_STD);

    const updated = {
      ...TARIFF_STD,
      tariff_alt_text: [{ language: 'fr', text: 'Tarif standard mis a jour' }],
      elements: [
        {
          price_components: [
            { type: 'ENERGY', price: 0.28, vat: 0.2, step_size: 1 },
            { type: 'TIME', price: 2.4, vat: 0.2, step_size: 60 },
            { type: 'FLAT', price: 1.0, vat: 0.2, step_size: 1 },
          ],
        },
      ],
    };
    const putResp = await http.put(
      `${RECEIVER_URL}/${CPO_COUNTRY}/${CPO_PARTY}/${TARIFF_STD.id}`,
      updated,
      { headers: ocpiCpoHeaders() },
    );
    expect(putResp.status).toBe(200);

    const getResp = await getTariff(TARIFF_STD.id);
    expect(getResp.data.data.elements[0].price_components).toHaveLength(3);
  });
});

/**
 * Hub / roaming partner isolation tests.
 *
 * Scenario (mirrors tariffs-hub-roaming-test-curls.sh):
 *   - Our platform acts as eMSP: FR/ZET (the Tenant)
 *   - Hub (TenantPartner): FR/107 (Gireve)
 *   - Roaming CPO A (RoamingPartner): FR/CPO
 *   - Roaming CPO B (RoamingPartner): DE/BTU
 *
 * Both roaming CPOs push a tariff with the SAME ocpiTariffId ("TARIFF-SHARED-ID"),
 * forwarded to us via the hub. We verify:
 *   1. Both tariffs are created independently (no collision on the shared id)
 *   2. Updating CPO A's tariff does NOT affect CPO B's tariff
 *   3. TariffElements are replaced (not accumulated) on repeated PUTs
 *   4. Deleting CPO A's tariff does NOT affect CPO B's tariff
 *
 * NOTE: this assumes RoamingPartner rows for FR/CPO and DE/BTU, linked to the
 * FR/107 TenantPartner (the hub), already exist in the DB — same prerequisite
 * as the bash script this test suite is based on.
 */
describe('hub / roaming partner', () => {
  const SHARED_ID = 'TARIFF-SHARED-ID';
  const CPO_A = { countryCode: 'FR', partyId: 'CPO' } as const;
  const CPO_B = { countryCode: 'FR', partyId: 'BTU' } as const;

  // Requests arrive via the hub (FR/107), so OCPI routing headers use 107 as
  // the sender and our own party (ZET) as the receiver. The country_code /
  // party_id in the URL and body identify the actual roaming CPO.
  // function hubHeaders() {
  //   return {
  //     ...ocpiHubHeaders(),
  //   };
  // }

  function hubUrl(cpo: { countryCode: string; partyId: string }, id: string) {
    return `${RECEIVER_URL}/${cpo.countryCode}/${cpo.partyId}/${id}`;
  }

  async function putHubTariff(
    cpo: { countryCode: string; partyId: string },
    body: unknown,
  ) {
    return http.put(hubUrl(cpo, SHARED_ID), body, {
      headers: ocpiHubHeaders(cpo.partyId, cpo.countryCode),
    });
  }

  async function getHubTariff(cpo: { countryCode: string; partyId: string }) {
    console.log('getHubTariff', cpo.partyId, cpo.countryCode);
    return http.get(hubUrl(cpo, SHARED_ID), {
      headers: ocpiHubHeaders(cpo.partyId, cpo.countryCode),
    });
  }

  async function deleteHubTariff(cpo: {
    countryCode: string;
    partyId: string;
  }) {
    const resp = await http.delete(hubUrl(cpo, SHARED_ID), {
      headers: ocpiHubHeaders(cpo.partyId, cpo.countryCode),
    });
    if (resp.status !== 200 && resp.status !== 404) {
      console.warn(
        `cleanup DELETE hub ${cpo.countryCode}/${cpo.partyId}/${SHARED_ID}: ${resp.status}`,
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
    last_updated: '2026-01-01T00:00:00Z',
  };

  const tariffBCreate = {
    id: SHARED_ID,
    country_code: CPO_B.countryCode,
    party_id: CPO_B.partyId,
    currency: 'EUR',
    type: 'REGULAR',
    tariff_alt_text: [
      { language: 'de', text: 'Deutscher CPO Tarif - Zeit und Energie' },
      { language: 'en', text: 'German CPO tariff - time and energy' },
    ],
    elements: [
      {
        price_components: [
          { type: 'ENERGY', price: 0.3, vat: 19.0, step_size: 1 },
          { type: 'TIME', price: 2.0, vat: 19.0, step_size: 60 },
        ],
      },
    ],
    last_updated: '2026-01-01T00:00:00Z',
  };

  const tariffAUpdate = {
    id: SHARED_ID,
    country_code: CPO_A.countryCode,
    party_id: CPO_A.partyId,
    currency: 'EUR',
    type: 'REGULAR',
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

  it('creates tariffs independently for two roaming CPOs sharing the same ocpiTariffId', async () => {
    const putA = await putHubTariff(CPO_A, tariffACreate);
    expect(putA.status).toBe(200);

    const putB = await putHubTariff(CPO_B, tariffBCreate);
    expect(putB.status).toBe(200);

    const getA = await getHubTariff(CPO_A);
    expect(getA.status).toBe(200);
    expect(getA.data.data.country_code).toBe('FR');
    expect(getA.data.data.party_id).toBe('CPO');
    expect(getA.data.data.currency).toBe('EUR');
    expect(getA.data.data.elements[0].price_components).toHaveLength(1); // ENERGY only

    const getB = await getHubTariff(CPO_B);
    expect(getB.status).toBe(200);
    expect(getB.data.data.country_code).toBe('FR');
    expect(getB.data.data.party_id).toBe('BTU');
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

    // CPO B must be completely unaffected by CPO A's update.
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

    // Re-apply the identical update; price_components must not double up.
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

  it('maps hub-forwarded tariffs to the correct RoamingPartner rows in the DB', async () => {
    await putHubTariff(CPO_A, tariffACreate);
    await putHubTariff(CPO_B, tariffBCreate);

    const result = await graphqlQuery<{
      Tariffs: {
        ocpiTariffId: string;
        currency: string;
        TenantPartner: { countryCode: string; partyId: string };
        RoamingPartner: { countryCode: string; partyId: string };
      }[];
    }>(
      `query ($ocpiTariffId: String!) {
        Tariffs(where: { ocpiTariffId: { _eq: $ocpiTariffId } }) {
          ocpiTariffId
          currency
          TenantPartner { countryCode partyId }
          RoamingPartner { countryCode partyId }
        }
      }`,
      { ocpiTariffId: SHARED_ID },
    );

    expect(result.Tariffs.every((t) => t.TenantPartner.partyId === '123')).toBe(
      true,
    );
    const pairs = result.Tariffs.map(
      (r) => `${r.RoamingPartner.countryCode}/${r.RoamingPartner.partyId}`,
    );
    expect(pairs).toEqual(expect.arrayContaining(['FR/CPO', 'FR/BTU']));
  });
});
