// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

/**
 * Our eMSP Tariffs receiver (PUT/GET/DELETE) and CPO sender (GET list), driven by the
 * direct CPO partner FR/CPO. The same flows through the Gireve hub live in
 * tariffHubMapping.test.ts.
 */

import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'crypto';
import {
  RECEIVER_URL,
  SENDER_URL,
  http,
  ocpiCpoHeaders,
  graphqlQuery,
} from '../helpers/ocpi-client';

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
  // The sender interface only lists OUR tariffs (tenant FR/ZET, no tenantPartnerId),
  // and nothing else in this file creates one: insert two so there is a second page.
  beforeAll(async () => {
    const runId = randomUUID().slice(0, 8);
    // Distinct createdAt: GET_TARIFFS_QUERY orders by createdAt only, so equal values
    // page non-deterministically (offset 1 can return the offset-0 row again).
    const now = Date.now();
    const ownTariff = (n: number, price: number) => ({
      tenantId: 1,
      currency: 'EUR',
      ocpiTariffId: `OWN-PAGE-${n}-${runId}`,
      startDateTime: '2025-01-01T00:00:00Z',
      createdAt: new Date(now + n).toISOString(),
      updatedAt: new Date(now + n).toISOString(),
      // The sender mapper rejects a tariff without elements.
      TariffElements: {
        data: [
          {
            priceComponents: [{ type: 'ENERGY', price, step_size: 1 }],
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: '2025-01-01T00:00:00Z',
          },
        ],
      },
    });
    await graphqlQuery(
      `mutation ($objects: [Tariffs_insert_input!]!) {
        insert_Tariffs(objects: $objects) { affected_rows }
      }`,
      { objects: [ownTariff(1, 0.3), ownTariff(2, 0.4)] },
    );
  });

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
