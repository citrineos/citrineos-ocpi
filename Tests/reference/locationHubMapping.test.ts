// SPDX-FileCopyrightText: 2026 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

/**
 * Locations module OCPI 2.2.1 - Hub / Roaming Partner isolation tests.
 *
 * Converted from Tests/location-hub-test-curls-part-one.sh and
 * Tests/location-hub-test-curls-part-two.sh.
 *
 * Topology (mirrors tariffEHUBMapping.test.ts / cdrsHubMapping.test.ts):
 *   - Our platform acts as eMSP (the Tenant).
 *   - Hub (TenantPartner): FR/123, authenticated with HUB_AUTH_TOKEN.
 *   - Roaming CPO A (RoamingPartner under the hub): FR/CPO.
 *   - Roaming CPO B (RoamingPartner under the hub): FR/BTU.
 *
 * NOTE: the raw bash scripts used FR/CPO and DE/EVP as the two roaming
 * partners forwarded through hub FR/107. The seeded test DB
 * (seeders/20260803171237-default-roaming-partner.ts) only configures
 * FR/CPO and FR/BTU under the FR/123 hub tenant partner, so this suite
 * exercises isolation between those two instead — the scenario (two
 * roaming CPOs pushing locations/EVSEs/connectors with the SAME ids) is
 * identical. All "DE/EVP" references and bodies from the raw scripts are
 * translated to "FR/BTU" here.
 *
 * Roaming partner identity for a hub-forwarded request is resolved from the
 * OCPI-from-country-code / OCPI-from-party-id headers (see AuthMiddleware),
 * not from the request body or URL — so isolation is driven by using
 * distinct `ocpiHubHeaders(partyId, countryCode)` per roaming CPO, exactly
 * like the hub tests for Tariffs and CDRs.
 *
 * As in locationEMSPMapping.test.ts: Locations/EVSEs/Connectors have no
 * delete route (405 on DELETE — see LocationsModuleApi.ts, only
 * GET/PUT/PATCH are registered on the receiver interface), and EVSEs are
 * never hard-deleted, only marked REMOVED via PATCH. Since there is no way
 * to clean up created locations, every location id here is suffixed with a
 * per-run RUN_ID so re-running this suite never collides with a previous
 * run's data.
 *
 * Per LocationReceiverService/LocationsService: unknown location/EVSE/
 * connector GETs and PATCH validation errors (e.g. missing last_updated)
 * come back as HTTP 200 with an OCPI error status_code in the body — except
 * the standalone PATCH EVSE route, which maps a ClientUnknownLocation error
 * to HTTP 404.
 */

import { beforeAll, describe, expect, it } from '@jest/globals';
import { randomUUID } from 'crypto';
import {
  http,
  ocpiHubHeaders,
  graphqlQuery,
  assertOcpiError,
} from '../../../../Tests/helpers/ocpi-client';

const OCPI_BASE = process.env.OCPI_BASE ?? 'http://localhost:8085/ocpi';
const OCPI_VERSION = process.env.OCPI_VERSION ?? '2.2.1';
const LOCATIONS_PREFIX = `${OCPI_BASE}/emsp/${OCPI_VERSION}/locations`;
const TARIFFS_PREFIX = `${OCPI_BASE}/emsp/${OCPI_VERSION}/tariffs`;

type Cpo = { countryCode: string; partyId: string };

const CPO_A: Cpo = { countryCode: 'FR', partyId: 'CPO' };
const CPO_B: Cpo = { countryCode: 'FR', partyId: 'BTU' };

// Unique per test-run so re-running this suite never collides with
// locations left behind by a previous run (locations have no delete route).
const RUN_ID = randomUUID().slice(0, 8);
const tid = (cpo: Cpo, suffix: string) =>
  `TARIFF-${cpo.partyId}-${suffix}-${RUN_ID}`;

function hubHeaders(cpo: Cpo) {
  return ocpiHubHeaders(cpo.partyId, cpo.countryCode);
}

function locBaseUrl(cpo: Cpo) {
  return `${LOCATIONS_PREFIX}/${cpo.countryCode}/${cpo.partyId}`;
}
function locUrl(cpo: Cpo, locationId: string) {
  return `${locBaseUrl(cpo)}/${locationId}`;
}
function evseUrl(cpo: Cpo, locationId: string, evseUid: string) {
  return `${locUrl(cpo, locationId)}/${evseUid}`;
}
function connUrl(
  cpo: Cpo,
  locationId: string,
  evseUid: string,
  connectorId: string,
) {
  return `${evseUrl(cpo, locationId, evseUid)}/${connectorId}`;
}

async function putLocation(cpo: Cpo, locationId: string, body: unknown) {
  return http.put(locUrl(cpo, locationId), body, { headers: hubHeaders(cpo) });
}
async function getLocation(cpo: Cpo, locationId: string) {
  return http.get(locUrl(cpo, locationId), { headers: hubHeaders(cpo) });
}
async function patchLocation(cpo: Cpo, locationId: string, body: unknown) {
  return http.patch(locUrl(cpo, locationId), body, {
    headers: hubHeaders(cpo),
  });
}

async function putEvse(
  cpo: Cpo,
  locationId: string,
  evseUid: string,
  body: unknown,
) {
  return http.put(evseUrl(cpo, locationId, evseUid), body, {
    headers: hubHeaders(cpo),
  });
}
async function getEvse(cpo: Cpo, locationId: string, evseUid: string) {
  return http.get(evseUrl(cpo, locationId, evseUid), {
    headers: hubHeaders(cpo),
  });
}
async function patchEvse(
  cpo: Cpo,
  locationId: string,
  evseUid: string,
  body: unknown,
) {
  return http.patch(evseUrl(cpo, locationId, evseUid), body, {
    headers: hubHeaders(cpo),
  });
}

async function putConnector(
  cpo: Cpo,
  locationId: string,
  evseUid: string,
  connectorId: string,
  body: unknown,
) {
  return http.put(connUrl(cpo, locationId, evseUid, connectorId), body, {
    headers: hubHeaders(cpo),
  });
}
async function getConnector(
  cpo: Cpo,
  locationId: string,
  evseUid: string,
  connectorId: string,
) {
  return http.get(connUrl(cpo, locationId, evseUid, connectorId), {
    headers: hubHeaders(cpo),
  });
}
async function patchConnector(
  cpo: Cpo,
  locationId: string,
  evseUid: string,
  connectorId: string,
  body: unknown,
) {
  return http.patch(connUrl(cpo, locationId, evseUid, connectorId), body, {
    headers: hubHeaders(cpo),
  });
}

async function seedTariff(cpo: Cpo, tariffId: string) {
  return http.put(
    `${TARIFFS_PREFIX}/${cpo.countryCode}/${cpo.partyId}/${tariffId}`,
    {
      id: tariffId,
      country_code: cpo.countryCode,
      party_id: cpo.partyId,
      currency: 'EUR',
      type: 'REGULAR',
      elements: [
        {
          price_components: [
            { type: 'ENERGY', price: 0.25, vat: 20.0, step_size: 1 },
          ],
        },
      ],
    },
    { headers: hubHeaders(cpo) },
  );
}

const TARIFF_SUFFIXES = [
  '001',
  '002',
  'A',
  'B',
  'REPLACED',
  'NEW-X',
  'NEW-Y',
  'CASCADE',
  'C1',
];

beforeAll(async () => {
  await Promise.all([
    ...TARIFF_SUFFIXES.map((s) => seedTariff(CPO_A, tid(CPO_A, s))),
    ...TARIFF_SUFFIXES.map((s) => seedTariff(CPO_B, tid(CPO_B, s))),
  ]);
});

function findEvse(body: any, uid: string) {
  return (body?.data?.evses ?? []).find((e: any) => e.uid === uid);
}

describe('hub / roaming partner isolation — location create, read, update', () => {
  const SHARED_ID = `LOC-SHARED-${RUN_ID}`;

  function locationBodyFor(cpo: Cpo) {
    const isA = cpo === CPO_A;
    return {
      country_code: cpo.countryCode,
      party_id: cpo.partyId,
      id: SHARED_ID,
      publish: true,
      name: isA ? 'French CPO Station Paris' : 'BTU Station Marseille',
      address: isA ? '10 Avenue des Champs-Elysees' : '1 Vieux Port',
      city: isA ? 'Paris' : 'Marseille',
      postal_code: isA ? '75008' : '13001',
      country: 'FRA',
      coordinates: isA
        ? { latitude: '48.873792', longitude: '2.295039' }
        : { latitude: '43.295478', longitude: '5.373993' },
      parking_type: isA ? 'ON_STREET' : 'PARKING_GARAGE',
      evses: [
        {
          uid: `EVSE-${cpo.partyId}-001`,
          evse_id: `${cpo.countryCode}*${cpo.partyId}*E000000001`,
          status: 'AVAILABLE',
          capabilities: isA
            ? ['RFID_READER', 'REMOTE_START_STOP_CAPABLE']
            : ['CONTACTLESS_CARD_SUPPORT', 'REMOTE_START_STOP_CAPABLE'],
          connectors: [
            {
              id: '1',
              standard: isA ? 'IEC_62196_T2' : 'IEC_62196_T2_COMBO',
              format: isA ? 'SOCKET' : 'CABLE',
              power_type: isA ? 'AC_3_PHASE' : 'DC',
              max_voltage: isA ? 230 : 920,
              max_amperage: isA ? 32 : 400,
              max_electric_power: isA ? 22000 : 150000,
              tariff_ids: [tid(cpo, '001')],
              last_updated: '2026-01-01T00:00:00Z',
            },
          ],
          floor_level: isA ? '0' : '-1',
          physical_reference: isA ? 'A1' : 'B1',
          last_updated: '2026-01-01T00:00:00Z',
        },
      ],
      time_zone: isA ? 'Europe/Paris' : 'Europe/Paris',
      last_updated: '2026-01-01T00:00:00Z',
    };
  }

  it('creates the shared-id location independently for both roaming CPOs', async () => {
    const putA = await putLocation(CPO_A, SHARED_ID, locationBodyFor(CPO_A));
    expect(putA.status).toBe(200);

    const putB = await putLocation(CPO_B, SHARED_ID, locationBodyFor(CPO_B));
    expect(putB.status).toBe(200);

    const getA = await getLocation(CPO_A, SHARED_ID);
    expect(getA.status).toBe(200);
    expect(getA.data.data.id).toBe(SHARED_ID);
    expect(getA.data.data.name).toBe('French CPO Station Paris');
    expect(getA.data.data.city).toBe('Paris');
    expect(getA.data.data.country_code).toBe('FR');
    expect(getA.data.data.party_id).toBe('CPO');
    expect(getA.data.data.parking_type).toBe('ON_STREET');
    expect(getA.data.data.evses).toHaveLength(1);
    const evseA = findEvse(getA.data, 'EVSE-CPO-001');
    expect(evseA.status).toBe('AVAILABLE');
    expect(evseA.connectors[0].standard).toBe('IEC_62196_T2');
    expect(evseA.connectors[0].tariff_ids).toContain(tid(CPO_A, '001'));

    const getB = await getLocation(CPO_B, SHARED_ID);
    expect(getB.status).toBe(200);
    expect(getB.data.data.id).toBe(SHARED_ID);
    expect(getB.data.data.name).toBe('BTU Station Marseille');
    expect(getB.data.data.city).toBe('Marseille');
    expect(getB.data.data.country_code).toBe('FR');
    expect(getB.data.data.party_id).toBe('BTU');
    expect(getB.data.data.parking_type).toBe('PARKING_GARAGE');
    expect(getB.data.data.evses).toHaveLength(1);
    const evseB = findEvse(getB.data, 'EVSE-BTU-001');
    expect(evseB.status).toBe('AVAILABLE');
    expect(evseB.connectors[0].standard).toBe('IEC_62196_T2_COMBO');
    expect(evseB.connectors[0].tariff_ids).toContain(tid(CPO_B, '001'));
  });

  it("isolates updates: patching CPO A's location does not affect CPO B's", async () => {
    await putLocation(CPO_A, SHARED_ID, locationBodyFor(CPO_A));
    await putLocation(CPO_B, SHARED_ID, locationBodyFor(CPO_B));

    const patch = await patchLocation(CPO_A, SHARED_ID, {
      name: 'French CPO Station Paris UPDATED',
      parking_type: 'UNDERGROUND_GARAGE',
      last_updated: '2026-06-01T00:00:00Z',
    });
    expect(patch.status).toBe(200);

    const getA = await getLocation(CPO_A, SHARED_ID);
    expect(getA.data.data.name).toBe('French CPO Station Paris UPDATED');
    expect(getA.data.data.parking_type).toBe('UNDERGROUND_GARAGE');
    expect(getA.data.data.city).toBe('Paris');

    // CPO B must be completely unaffected by CPO A's patch.
    const getB = await getLocation(CPO_B, SHARED_ID);
    expect(getB.data.data.name).toBe('BTU Station Marseille');
    expect(getB.data.data.city).toBe('Marseille');
    expect(getB.data.data.parking_type).toBe('PARKING_GARAGE');
  });

  it("adds a second EVSE to CPO A's location without affecting CPO B's EVSE count", async () => {
    await putLocation(CPO_A, SHARED_ID, locationBodyFor(CPO_A));
    await putLocation(CPO_B, SHARED_ID, locationBodyFor(CPO_B));

    const put = await putEvse(CPO_A, SHARED_ID, 'EVSE-CPO-002', {
      uid: 'EVSE-CPO-002',
      evse_id: 'FR*CPO*E000000002',
      status: 'AVAILABLE',
      capabilities: ['RFID_READER'],
      connectors: [
        {
          id: '1',
          standard: 'IEC_62196_T2_COMBO',
          format: 'CABLE',
          power_type: 'DC',
          max_voltage: 400,
          max_amperage: 125,
          max_electric_power: 50000,
          tariff_ids: [tid(CPO_A, '002')],
          last_updated: '2026-06-01T00:00:00Z',
        },
      ],
      floor_level: '0',
      physical_reference: 'A2',
      last_updated: '2026-06-01T00:00:00Z',
    });
    expect(put.status).toBe(200);

    const getA = await getLocation(CPO_A, SHARED_ID);
    expect(getA.data.data.evses).toHaveLength(2);
    const evseA2 = findEvse(getA.data, 'EVSE-CPO-002');
    expect(evseA2.status).toBe('AVAILABLE');
    expect(evseA2.connectors[0].tariff_ids).toContain(tid(CPO_A, '002'));

    const getB = await getLocation(CPO_B, SHARED_ID);
    expect(getB.data.data.evses).toHaveLength(1);
    expect(getB.data.data.name).toBe('BTU Station Marseille');
  });

  it("patches CPO A's EVSE status without affecting CPO B's EVSE", async () => {
    await putLocation(CPO_A, SHARED_ID, locationBodyFor(CPO_A));
    await putLocation(CPO_B, SHARED_ID, locationBodyFor(CPO_B));

    const patch = await patchEvse(CPO_A, SHARED_ID, 'EVSE-CPO-001', {
      status: 'CHARGING',
      last_updated: '2026-06-01T01:00:00Z',
    });
    expect(patch.status).toBe(200);

    const getA = await getEvse(CPO_A, SHARED_ID, 'EVSE-CPO-001');
    expect(getA.data.data.status).toBe('CHARGING');

    const getB = await getEvse(CPO_B, SHARED_ID, 'EVSE-BTU-001');
    expect(getB.data.data.status).toBe('AVAILABLE');
  });

  it("patches CPO B's connector tariff_ids without affecting CPO A's connector", async () => {
    await putLocation(CPO_A, SHARED_ID, locationBodyFor(CPO_A));
    await putLocation(CPO_B, SHARED_ID, locationBodyFor(CPO_B));

    const patch = await patchConnector(CPO_B, SHARED_ID, 'EVSE-BTU-001', '1', {
      tariff_ids: [tid(CPO_B, '002')],
      last_updated: '2026-06-01T02:00:00Z',
    });
    expect(patch.status).toBe(200);

    const getB = await getConnector(CPO_B, SHARED_ID, 'EVSE-BTU-001', '1');
    expect(getB.data.data.tariff_ids).toContain(tid(CPO_B, '002'));
    expect(getB.data.data.standard).toBe('IEC_62196_T2_COMBO');

    const getA = await getConnector(CPO_A, SHARED_ID, 'EVSE-CPO-001', '1');
    expect(getA.data.data.tariff_ids).toContain(tid(CPO_A, '001'));
    expect(getA.data.data.standard).toBe('IEC_62196_T2');
  });

  it('maps hub-forwarded locations to the correct RoamingPartner rows in the DB', async () => {
    await putLocation(CPO_A, SHARED_ID, locationBodyFor(CPO_A));
    await putLocation(CPO_B, SHARED_ID, locationBodyFor(CPO_B));

    const result = await graphqlQuery<{
      Locations: {
        ocpiLocationId: string;
        TenantPartner: { countryCode: string; partyId: string };
        RoamingPartner: { countryCode: string; partyId: string } | null;
      }[];
    }>(
      `query ($ocpiLocationId: String!) {
        Locations(where: { ocpiLocationId: { _eq: $ocpiLocationId } }) {
          ocpiLocationId
          TenantPartner { countryCode partyId }
          RoamingPartner { countryCode partyId }
        }
      }`,
      { ocpiLocationId: SHARED_ID },
    );

    type LocationRow = {
      ocpiLocationId: string;
      TenantPartner: { countryCode: string; partyId: string };
      RoamingPartner: { countryCode: string; partyId: string } | null;
    };

    expect(result.Locations.length).toBeGreaterThanOrEqual(2);
    expect(
      result.Locations.every(
        (l: LocationRow) => l.TenantPartner.partyId === '123',
      ),
    ).toBe(true);
    const pairs = result.Locations.map(
      (l: LocationRow) =>
        `${l.RoamingPartner?.countryCode}/${l.RoamingPartner?.partyId}`,
    );
    expect(pairs).toEqual(expect.arrayContaining(['FR/CPO', 'FR/BTU']));
  });
});

describe('hub / roaming partner isolation — connector PUT/PATCH, idempotency, cascade', () => {
  const LOC_ID = `LOC-HUB-CONN-${RUN_ID}`;

  function baseLocationBody(cpo: Cpo) {
    const isA = cpo === CPO_A;
    return {
      country_code: cpo.countryCode,
      party_id: cpo.partyId,
      id: LOC_ID,
      publish: true,
      name: isA ? 'CPO A Hub Patch Location' : 'CPO B Hub Patch Location',
      address: isA ? '1 Rue de la Paix' : '1 Vieux Port',
      city: isA ? 'Paris' : 'Marseille',
      postal_code: isA ? '75001' : '13001',
      country: 'FRA',
      coordinates: isA
        ? { latitude: '48.869', longitude: '2.331' }
        : { latitude: '43.295', longitude: '5.374' },
      parking_type: isA ? 'ON_STREET' : 'PARKING_GARAGE',
      time_zone: 'Europe/Paris',
      evses: [
        {
          // Same EVSE uid/connector ids for both CPOs to stress-test isolation.
          uid: 'EVSE-A',
          evse_id: `${cpo.countryCode}*${cpo.partyId}*EA00000001`,
          status: 'AVAILABLE',
          capabilities: isA
            ? ['RFID_READER', 'REMOTE_START_STOP_CAPABLE']
            : ['CONTACTLESS_CARD_SUPPORT', 'REMOTE_START_STOP_CAPABLE'],
          connectors: [
            {
              id: '1',
              standard: isA ? 'IEC_62196_T2' : 'IEC_62196_T2_COMBO',
              format: isA ? 'SOCKET' : 'CABLE',
              power_type: isA ? 'AC_3_PHASE' : 'DC',
              max_voltage: isA ? 230 : 920,
              max_amperage: isA ? 32 : 400,
              max_electric_power: isA ? 22000 : 150000,
              tariff_ids: [tid(cpo, '001')],
              terms_and_conditions: isA
                ? 'https://cpo-a.example.com/terms'
                : 'https://cpo-b.example.com/terms',
              last_updated: '2026-01-01T00:00:00Z',
            },
            {
              id: '2',
              standard: isA ? 'IEC_62196_T2_COMBO' : 'IEC_62196_T2',
              format: isA ? 'CABLE' : 'SOCKET',
              power_type: isA ? 'DC' : 'AC_1_PHASE',
              max_voltage: isA ? 400 : 230,
              max_amperage: isA ? 125 : 16,
              max_electric_power: isA ? 50000 : 3680,
              tariff_ids: [tid(cpo, 'A')],
              last_updated: '2026-01-01T00:00:00Z',
            },
          ],
          floor_level: isA ? '0' : '-1',
          physical_reference: isA ? 'A1' : 'B1',
          last_updated: '2026-01-01T00:00:00Z',
        },
      ],
      last_updated: '2026-01-01T00:00:00Z',
    };
  }

  beforeAll(async () => {
    const putA = await putLocation(CPO_A, LOC_ID, baseLocationBody(CPO_A));
    expect(putA.status).toBe(200);
    const putB = await putLocation(CPO_B, LOC_ID, baseLocationBody(CPO_B));
    expect(putB.status).toBe(200);
  });

  it('GETs the same connector id with different data per roaming partner', async () => {
    const getA = await getConnector(CPO_A, LOC_ID, 'EVSE-A', '1');
    expect(getA.status).toBe(200);
    expect(getA.data.data.standard).toBe('IEC_62196_T2');
    expect(getA.data.data.max_voltage).toBe(230);
    expect(getA.data.data.max_amperage).toBe(32);
    expect(getA.data.data.terms_and_conditions).toBe(
      'https://cpo-a.example.com/terms',
    );

    const getB = await getConnector(CPO_B, LOC_ID, 'EVSE-A', '1');
    expect(getB.status).toBe(200);
    expect(getB.data.data.standard).toBe('IEC_62196_T2_COMBO');
    expect(getB.data.data.max_voltage).toBe(920);
    expect(getB.data.data.max_amperage).toBe(400);
    expect(getB.data.data.terms_and_conditions).toBe(
      'https://cpo-b.example.com/terms',
    );
  });

  it("PUT replacing CPO A's connector does not affect CPO B's connector with the same id", async () => {
    const put = await putConnector(CPO_A, LOC_ID, 'EVSE-A', '1', {
      id: '1',
      standard: 'IEC_62196_T2',
      format: 'CABLE',
      power_type: 'AC_1_PHASE',
      max_voltage: 230,
      max_amperage: 16,
      max_electric_power: 3680,
      tariff_ids: [tid(CPO_A, 'REPLACED')],
      terms_and_conditions: 'https://cpo-a.example.com/new-terms',
      last_updated: '2026-02-01T10:00:00Z',
    });
    expect(put.status).toBe(200);

    const getA = await getConnector(CPO_A, LOC_ID, 'EVSE-A', '1');
    expect(getA.data.data.format).toBe('CABLE');
    expect(getA.data.data.power_type).toBe('AC_1_PHASE');
    expect(getA.data.data.tariff_ids).toContain(tid(CPO_A, 'REPLACED'));
    expect(getA.data.data.tariff_ids).not.toContain(tid(CPO_A, '001'));

    const getB = await getConnector(CPO_B, LOC_ID, 'EVSE-A', '1');
    expect(getB.data.data.standard).toBe('IEC_62196_T2_COMBO');
    expect(getB.data.data.max_voltage).toBe(920);
    expect(getB.data.data.tariff_ids).toContain(tid(CPO_B, '001'));
    expect(getB.data.data.terms_and_conditions).toBe(
      'https://cpo-b.example.com/terms',
    );
  });

  it("PATCH updating CPO A's connector tariff_ids does not affect CPO B's connector", async () => {
    const patch = await patchConnector(CPO_A, LOC_ID, 'EVSE-A', '1', {
      tariff_ids: [tid(CPO_A, 'NEW-X'), tid(CPO_A, 'NEW-Y')],
      last_updated: '2026-02-15T08:00:00Z',
    });
    expect(patch.status).toBe(200);

    const getA = await getConnector(CPO_A, LOC_ID, 'EVSE-A', '1');
    expect(getA.data.data.tariff_ids).toEqual(
      expect.arrayContaining([tid(CPO_A, 'NEW-X'), tid(CPO_A, 'NEW-Y')]),
    );

    const getB = await getConnector(CPO_B, LOC_ID, 'EVSE-A', '1');
    expect(getB.data.data.tariff_ids).toContain(tid(CPO_B, '001'));
    expect(getB.data.data.standard).toBe('IEC_62196_T2_COMBO');
    expect(getB.data.data.max_amperage).toBe(400);
  });

  it("cascades CPO A's connector patch to CPO A's EVSE/Location only, not CPO B's", async () => {
    const locABefore = await getLocation(CPO_A, LOC_ID);
    const evseABefore = await getEvse(CPO_A, LOC_ID, 'EVSE-A');
    const locBBefore = await getLocation(CPO_B, LOC_ID);
    const evseBBefore = await getEvse(CPO_B, LOC_ID, 'EVSE-A');

    const patch = await patchConnector(CPO_A, LOC_ID, 'EVSE-A', '1', {
      tariff_ids: [tid(CPO_A, 'CASCADE')],
      last_updated: '2026-06-01T12:00:00Z',
    });
    expect(patch.status).toBe(200);

    const locAAfter = await getLocation(CPO_A, LOC_ID);
    const evseAAfter = await getEvse(CPO_A, LOC_ID, 'EVSE-A');
    expect(locAAfter.data.data.last_updated).not.toBe(
      locABefore.data.data.last_updated,
    );
    expect(evseAAfter.data.data.last_updated).not.toBe(
      evseABefore.data.data.last_updated,
    );

    const locBAfter = await getLocation(CPO_B, LOC_ID);
    const evseBAfter = await getEvse(CPO_B, LOC_ID, 'EVSE-A');
    expect(locBAfter.data.data.last_updated).toBe(
      locBBefore.data.data.last_updated,
    );
    expect(evseBAfter.data.data.last_updated).toBe(
      evseBBefore.data.data.last_updated,
    );
  });

  it("PATCHing CPO B's EVSE status does not affect CPO A's EVSE with the same uid", async () => {
    const patch = await patchEvse(CPO_B, LOC_ID, 'EVSE-A', {
      status: 'OUT_OF_ORDER',
      last_updated: '2026-06-01T13:00:00Z',
    });
    expect(patch.status).toBe(200);

    const getB = await getEvse(CPO_B, LOC_ID, 'EVSE-A');
    expect(getB.data.data.status).toBe('OUT_OF_ORDER');

    const getA = await getEvse(CPO_A, LOC_ID, 'EVSE-A');
    expect(getA.data.data.status).toBe('AVAILABLE');
  });

  it("adds a third connector to CPO A's EVSE without it appearing for CPO B", async () => {
    const put = await putConnector(CPO_A, LOC_ID, 'EVSE-A', '3', {
      id: '3',
      standard: 'CHADEMO',
      format: 'CABLE',
      power_type: 'DC',
      max_voltage: 500,
      max_amperage: 100,
      max_electric_power: 50000,
      tariff_ids: [tid(CPO_A, 'C1')],
      last_updated: '2026-03-01T08:00:00Z',
    });
    expect(put.status).toBe(200);

    const getEvseA = await getEvse(CPO_A, LOC_ID, 'EVSE-A');
    expect(getEvseA.data.data.connectors).toHaveLength(3);

    const getEvseB = await getEvse(CPO_B, LOC_ID, 'EVSE-A');
    expect(getEvseB.data.data.connectors).toHaveLength(2);

    const getConnA = await getConnector(CPO_A, LOC_ID, 'EVSE-A', '3');
    expect(getConnA.status).toBe(200);
    expect(getConnA.data.data.standard).toBe('CHADEMO');

    const getConnB = await getConnector(CPO_B, LOC_ID, 'EVSE-A', '3');
    expect(getConnB.status).toBe(200);
    assertOcpiError(getConnB.data);
  });

  it('returns OCPI errors for missing last_updated, independently per roaming partner', async () => {
    const respA = await patchConnector(CPO_A, LOC_ID, 'EVSE-A', '1', {
      tariff_ids: ['SHOULD-FAIL'],
    });
    expect(respA.status).toBe(200);
    assertOcpiError(respA.data);

    const respB = await patchEvse(CPO_B, LOC_ID, 'EVSE-A', {
      status: 'AVAILABLE',
    });
    expect(respB.status).toBe(200);
    assertOcpiError(respB.data);
  });

  it('returns OCPI errors for unknown connector ids, independently per roaming partner', async () => {
    const respA = await getConnector(CPO_A, LOC_ID, 'EVSE-A', '99');
    expect(respA.status).toBe(200);
    assertOcpiError(respA.data);

    const respB = await getConnector(CPO_B, LOC_ID, 'EVSE-A', '99');
    expect(respB.status).toBe(200);
    assertOcpiError(respB.data);
  });

  it('returns an OCPI error for PATCH connector on an unknown EVSE for CPO A', async () => {
    const resp = await patchConnector(CPO_A, LOC_ID, 'EVSE-Z', '1', {
      tariff_ids: ['SHOULD-FAIL'],
      last_updated: '2026-09-01T10:00:00Z',
    });
    expect(resp.status).toBe(200);
    assertOcpiError(resp.data);
  });

  it('returns HTTP 405 for DELETE on the location, for both roaming CPOs', async () => {
    const respA = await http.delete(locUrl(CPO_A, LOC_ID), {
      headers: hubHeaders(CPO_A),
    });
    expect(respA.status).toBe(405);

    const respB = await http.delete(locUrl(CPO_B, LOC_ID), {
      headers: hubHeaders(CPO_B),
    });
    expect(respB.status).toBe(405);
  });

  it("marks CPO A's EVSE REMOVED via PATCH without affecting CPO B's EVSE", async () => {
    const patch = await patchEvse(CPO_A, LOC_ID, 'EVSE-A', {
      status: 'REMOVED',
      last_updated: '2026-09-02T10:00:00Z',
    });
    expect(patch.status).toBe(200);

    const getA = await getEvse(CPO_A, LOC_ID, 'EVSE-A');
    expect(getA.status).toBe(200);
    expect(getA.data.data.status).toBe('REMOVED');

    const getB = await getEvse(CPO_B, LOC_ID, 'EVSE-A');
    expect(getB.status).toBe(200);
    expect(getB.data.data.status).toBe('OUT_OF_ORDER');
  });
});
