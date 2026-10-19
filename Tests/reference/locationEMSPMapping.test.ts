// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

/**
 * Locations module OCPI 2.2.1 - eMSP Receiver Interface tests.
 *
 * Converted from Tests/location-test-curls-part-one.sh and
 * Tests/location-test-curls-part-two.sh.
 *
 * The raw bash scripts authenticate as direct (non-hub) CPO partners with
 * party_id "108" (part one, tenant FR/ZET) and "TMS" (part two, tenant
 * FR/ZTA). Neither of those TenantPartner rows exists in the seeded test DB
 * — only FR/CPO (see seeders/20250806120002-default-tenant-partner.ts,
 * tenantPartnerCPO) is seeded as a direct partner. This suite uses FR/CPO
 * instead, via the shared `ocpiCpoHeaders()` helper, and location bodies
 * carry country_code/party_id "FR"/"CPO" to match — required by
 * AuthMiddleware, which validates the OCPI-from-* headers (and, for PUT
 * location, the body's country_code/party_id) against the authenticated
 * tenant partner's own identity when no roaming partner match is found.
 *
 * Locations/EVSEs/Connectors have no delete/removal route at all:
 * `03_Modules/Locations/src/module/LocationsModuleApi.ts` only exposes
 * GET/PUT/PATCH on the receiver interface (`RCV`, `RCV_EVSE`, `RCV_CONN`) —
 * a DELETE hits routing-controllers' method-not-matched handler, which
 * `OcpiExceptionHandler` maps to HTTP 405. EVSEs are never hard-deleted;
 * OCPI models "removal" as PATCHing an EVSE's status to REMOVED, and the
 * EVSE remains GET-able afterwards. Since there is no way to clean up
 * created locations between runs, and PUT is an idempotent create-or-replace
 * (`LocationReceiverService` upserts, no unique-constraint conflict path),
 * this suite follows the CDRs pattern: every location id is suffixed with a
 * per-run RUN_ID so re-running the suite never collides with a previous
 * run's data — see cdrsEMSPMapping.test.ts for the same reasoning.
 *
 * Per `LocationReceiverService`/`LocationsService`, unknown location/EVSE/
 * connector GETs and PATCHes with validation errors (e.g. missing
 * `last_updated`) come back as HTTP 200 with an OCPI error `status_code`
 * (2003 ClientUnknownLocation / 2001 ClientInvalidOrMissingParameters) in
 * the body — NOT as HTTP 404/400. The one exception is the standalone PATCH
 * EVSE route, which explicitly maps a ClientUnknownLocation error to HTTP
 * 404 (see `LocationsModuleApi.patchEvseByCountryParty`).
 */

import { beforeAll, describe, expect, it } from '@jest/globals';
import { randomUUID } from 'crypto';
import {
  http,
  ocpiCpoHeaders,
  assertOcpiError,
} from '../../../../Tests/helpers/ocpi-client';

const OCPI_BASE = process.env.OCPI_BASE ?? 'http://localhost:8085/ocpi';
const OCPI_VERSION = process.env.OCPI_VERSION ?? '2.2.1';
const LOCATIONS_URL = `${OCPI_BASE}/emsp/${OCPI_VERSION}/locations/FR/CPO`;
const TARIFFS_URL = `${OCPI_BASE}/emsp/${OCPI_VERSION}/tariffs/FR/CPO`;

const CPO_COUNTRY = 'FR';
const CPO_PARTY = 'CPO';

// Unique per test-run so re-running this suite never collides with
// locations left behind by a previous run (locations have no delete route).
const RUN_ID = randomUUID().slice(0, 8);
const tid = (suffix: string) => `TARIFF-${suffix}-${RUN_ID}`;

function locUrl(locationId: string) {
  return `${LOCATIONS_URL}/${locationId}`;
}
function evseUrl(locationId: string, evseUid: string) {
  return `${locUrl(locationId)}/${evseUid}`;
}
function connUrl(locationId: string, evseUid: string, connectorId: string) {
  return `${evseUrl(locationId, evseUid)}/${connectorId}`;
}

async function putLocation(locationId: string, body: unknown) {
  return http.put(locUrl(locationId), body, { headers: ocpiCpoHeaders() });
}
async function getLocation(locationId: string) {
  return http.get(locUrl(locationId), { headers: ocpiCpoHeaders() });
}
async function patchLocation(locationId: string, body: unknown) {
  return http.patch(locUrl(locationId), body, { headers: ocpiCpoHeaders() });
}

async function putEvse(locationId: string, evseUid: string, body: unknown) {
  return http.put(evseUrl(locationId, evseUid), body, {
    headers: ocpiCpoHeaders(),
  });
}
async function getEvse(locationId: string, evseUid: string) {
  return http.get(evseUrl(locationId, evseUid), { headers: ocpiCpoHeaders() });
}
async function patchEvse(locationId: string, evseUid: string, body: unknown) {
  return http.patch(evseUrl(locationId, evseUid), body, {
    headers: ocpiCpoHeaders(),
  });
}

async function putConnector(
  locationId: string,
  evseUid: string,
  connectorId: string,
  body: unknown,
) {
  return http.put(connUrl(locationId, evseUid, connectorId), body, {
    headers: ocpiCpoHeaders(),
  });
}
async function getConnector(
  locationId: string,
  evseUid: string,
  connectorId: string,
) {
  return http.get(connUrl(locationId, evseUid, connectorId), {
    headers: ocpiCpoHeaders(),
  });
}
async function patchConnector(
  locationId: string,
  evseUid: string,
  connectorId: string,
  body: unknown,
) {
  return http.patch(connUrl(locationId, evseUid, connectorId), body, {
    headers: ocpiCpoHeaders(),
  });
}

async function seedTariff(tariffId: string) {
  return http.put(
    `${TARIFFS_URL}/${tariffId}`,
    {
      id: tariffId,
      country_code: CPO_COUNTRY,
      party_id: CPO_PARTY,
      currency: 'EUR',
      type: 'REGULAR',
      elements: [
        {
          price_components: [
            { type: 'ENERGY', price: 0.25, vat: 0.2, step_size: 1 },
          ],
        },
      ],
    },
    { headers: ocpiCpoHeaders() },
  );
}

const ALL_TARIFF_SUFFIXES = [
  '001',
  '002',
  '003',
  '004',
  '005',
  '006',
  'NEW-001',
  'A1',
  'A2',
  'B1',
  'REPLACED',
  'NEW-X',
  'NEW-Y',
  'IDEMPOTENT',
  'CASCADE',
  'C1',
];

beforeAll(async () => {
  await Promise.all(ALL_TARIFF_SUFFIXES.map((s) => seedTariff(tid(s))));
});

function fullLocationBody(locationId: string) {
  return {
    country_code: CPO_COUNTRY,
    party_id: CPO_PARTY,
    id: locationId,
    publish: true,
    name: 'Paris Charging Hub',
    address: '15 Rue de Rivoli',
    city: 'Paris',
    postal_code: '75001',
    state: 'Ile-de-France',
    country: 'FRA',
    coordinates: { latitude: '48.857489', longitude: '2.351074' },
    parking_type: 'ON_STREET',
    related_locations: [
      {
        latitude: '48.857600',
        longitude: '2.351200',
        name: { language: 'en', text: 'Main entrance' },
      },
    ],
    evses: [
      {
        uid: 'EVSE-001',
        evse_id: 'FR*CPO*E000000001',
        status: 'AVAILABLE',
        status_schedule: [
          {
            period_begin: '2025-01-01T00:00:00Z',
            period_end: '2025-12-31T23:59:59Z',
            status: 'AVAILABLE',
          },
        ],
        capabilities: [
          'CHARGING_PROFILE_CAPABLE',
          'REMOTE_START_STOP_CAPABLE',
          'RESERVABLE',
          'RFID_READER',
        ],
        connectors: [
          {
            id: '1',
            standard: 'IEC_62196_T2',
            format: 'SOCKET',
            power_type: 'AC_3_PHASE',
            max_voltage: 230,
            max_amperage: 32,
            max_electric_power: 22000,
            tariff_ids: [tid('001'), tid('002')],
            terms_and_conditions: 'https://example.com/terms',
            last_updated: '2025-01-15T10:00:00Z',
          },
          {
            id: '2',
            standard: 'IEC_62196_T2_COMBO',
            format: 'CABLE',
            power_type: 'DC',
            max_voltage: 920,
            max_amperage: 400,
            max_electric_power: 150000,
            tariff_ids: [tid('003')],
            terms_and_conditions: 'https://example.com/terms',
            last_updated: '2025-01-15T10:00:00Z',
          },
        ],
        floor_level: '-1',
        coordinates: { latitude: '48.857489', longitude: '2.351074' },
        physical_reference: 'A1',
        directions: [
          {
            language: 'en',
            text: 'Take the ramp down to level -1, EVSE is on the left',
          },
          {
            language: 'fr',
            text: 'Prenez la rampe jusqu au niveau -1, la borne est a gauche',
          },
        ],
        parking_restrictions: ['EV_ONLY'],
        images: [
          {
            url: 'https://example.com/images/evse001.jpg',
            category: 'CHARGER',
            type: 'jpeg',
            width: 800,
            height: 600,
          },
        ],
        last_updated: '2025-01-15T10:00:00Z',
      },
      {
        uid: 'EVSE-002',
        evse_id: 'FR*CPO*E000000002',
        status: 'CHARGING',
        capabilities: [
          'CONTACTLESS_CARD_SUPPORT',
          'CREDIT_CARD_PAYABLE',
          'REMOTE_START_STOP_CAPABLE',
        ],
        connectors: [
          {
            id: '1',
            standard: 'CHADEMO',
            format: 'CABLE',
            power_type: 'DC',
            max_voltage: 500,
            max_amperage: 120,
            max_electric_power: 50000,
            tariff_ids: [tid('004')],
            last_updated: '2025-01-15T10:00:00Z',
          },
        ],
        floor_level: '0',
        physical_reference: 'B2',
        parking_restrictions: ['EV_ONLY', 'CUSTOMERS'],
        last_updated: '2025-01-15T10:00:00Z',
      },
    ],
    directions: [
      {
        language: 'en',
        text: 'Located next to the Louvre entrance, near bus stop 42',
      },
    ],
    operator: {
      name: '108Charge',
      website: 'https://108charge.example.com',
      logo: {
        url: 'https://108charge.example.com/logo.png',
        category: 'OPERATOR',
        type: 'png',
        width: 200,
        height: 200,
      },
    },
    suboperator: {
      name: 'SubCharge Paris',
      website: 'https://subcharge.example.com',
    },
    owner: { name: 'City of Paris', website: 'https://paris.fr' },
    facilities: ['HOTEL', 'SHOPPING_CENTRE', 'MUSEUM'],
    time_zone: 'Europe/Paris',
    opening_times: {
      twentyfourseven: false,
      regular_hours: [
        { weekday: 1, period_begin: '07:00', period_end: '22:00' },
        { weekday: 6, period_begin: '08:00', period_end: '23:00' },
        { weekday: 7, period_begin: '09:00', period_end: '20:00' },
      ],
      exceptional_openings: [
        {
          period_begin: '2025-12-25T10:00:00Z',
          period_end: '2025-12-25T18:00:00Z',
        },
      ],
      exceptional_closings: [
        {
          period_begin: '2025-05-01T00:00:00Z',
          period_end: '2025-05-01T23:59:59Z',
        },
      ],
    },
    charging_when_closed: true,
    images: [
      {
        url: 'https://example.com/images/loc001.jpg',
        category: 'LOCATION',
        type: 'jpeg',
        width: 1920,
        height: 1080,
      },
    ],
    energy_mix: {
      is_green_energy: true,
      energy_sources: [
        { source: 'SOLAR', percentage: 60.0 },
        { source: 'WIND', percentage: 40.0 },
      ],
      environ_impact: [{ category: 'CARBON_DIOXIDE', amount: 0.0 }],
      supplier_name: 'GreenPower FR',
      energy_product_name: 'Pure Green 100',
    },
    last_updated: '2025-01-15T10:00:00Z',
  };
}

function findEvse(body: any, uid: string) {
  return (body?.data?.evses ?? []).find((e: any) => e.uid === uid);
}

describe('PUT + GET round trip: full location with EVSEs and connectors', () => {
  const LOC_ID = `LOC-FULL-${RUN_ID}`;

  it('creates the location and echoes matching data on GET', async () => {
    const put = await putLocation(LOC_ID, fullLocationBody(LOC_ID));
    expect(put.status).toBe(200);
    expect(put.data.status_code).toBe(1000);

    const get = await getLocation(LOC_ID);
    expect(get.status).toBe(200);
    const data = get.data.data;

    expect(data.party_id).toBe('CPO');
    expect(data.country_code).toBe('FR');
    expect(data.id).toBe(LOC_ID);
    expect(data.publish).toBe(true);
    expect(data.name).toBe('Paris Charging Hub');
    expect(data.address).toBe('15 Rue de Rivoli');
    expect(data.city).toBe('Paris');
    expect(data.postal_code).toBe('75001');
    expect(data.country).toBe('FRA');
    expect(data.parking_type).toBe('ON_STREET');
    expect(data.time_zone).toBe('Europe/Paris');
    expect(data.charging_when_closed).toBe(true);
    expect(data.coordinates.latitude).toBe('48.857489');
    expect(data.operator.name).toBe('108Charge');
    expect(data.suboperator.name).toBe('SubCharge Paris');
    expect(data.owner.name).toBe('City of Paris');
    expect(data.energy_mix.is_green_energy).toBe(true);
    expect(data.energy_mix.supplier_name).toBe('GreenPower FR');
    expect(data.opening_times.twentyfourseven).toBe(false);
    expect(data.facilities).toEqual(
      expect.arrayContaining(['HOTEL', 'MUSEUM']),
    );
    expect(data.evses).toHaveLength(2);
    expect(data.images).toHaveLength(1);
    expect(data.directions).toHaveLength(1);
    expect(data.related_locations).toHaveLength(1);

    const evse001 = findEvse(get.data, 'EVSE-001');
    expect(evse001).toBeDefined();
    expect(evse001.status).toBe('AVAILABLE');
    expect(evse001.floor_level).toBe('-1');
    expect(evse001.physical_reference).toBe('A1');
    expect(evse001.coordinates.latitude).toBe('48.857489');
    expect(evse001.capabilities).toEqual(
      expect.arrayContaining(['RFID_READER', 'RESERVABLE']),
    );
    expect(evse001.parking_restrictions).toContain('EV_ONLY');
    expect(evse001.connectors).toHaveLength(2);
    expect(evse001.status_schedule).toHaveLength(1);
    expect(evse001.images).toHaveLength(1);
    expect(evse001.directions).toHaveLength(2);

    expect(evse001.connectors[0].id).toBe('1');
    expect(evse001.connectors[0].standard).toBe('IEC_62196_T2');
    expect(evse001.connectors[0].format).toBe('SOCKET');
    expect(evse001.connectors[0].power_type).toBe('AC_3_PHASE');
    expect(evse001.connectors[0].max_voltage).toBe(230);
    expect(evse001.connectors[0].max_amperage).toBe(32);
    expect(evse001.connectors[0].tariff_ids).toEqual(
      expect.arrayContaining([tid('001'), tid('002')]),
    );
    expect(evse001.connectors[1].id).toBe('2');
    expect(evse001.connectors[1].standard).toBe('IEC_62196_T2_COMBO');
    expect(evse001.connectors[1].tariff_ids).toContain(tid('003'));

    const evse002 = findEvse(get.data, 'EVSE-002');
    expect(evse002).toBeDefined();
    expect(evse002.status).toBe('CHARGING');
    expect(evse002.floor_level).toBe('0');
    expect(evse002.capabilities).toContain('CREDIT_CARD_PAYABLE');
    expect(evse002.parking_restrictions).toContain('CUSTOMERS');
    expect(evse002.connectors).toHaveLength(1);
    expect(evse002.connectors[0].tariff_ids).toContain(tid('004'));
  });

  it('GETs the individual EVSE object', async () => {
    const get = await getEvse(LOC_ID, 'EVSE-001');
    expect(get.status).toBe(200);
    expect(get.data.data.uid).toBe('EVSE-001');
    expect(get.data.data.status).toBe('AVAILABLE');
    expect(get.data.data.evse_id).toBe('FR*CPO*E000000001');
    expect(get.data.data.floor_level).toBe('-1');
    expect(get.data.data.capabilities).toContain('RFID_READER');
    expect(get.data.data.connectors).toHaveLength(2);
  });

  it('GETs the individual connector object', async () => {
    const get = await getConnector(LOC_ID, 'EVSE-001', '1');
    expect(get.status).toBe(200);
    expect(get.data.data.id).toBe('1');
    expect(get.data.data.standard).toBe('IEC_62196_T2');
    expect(get.data.data.max_voltage).toBe(230);
    expect(get.data.data.max_amperage).toBe(32);
    expect(get.data.data.tariff_ids).toContain(tid('001'));
  });

  it('PUTs a standalone new EVSE onto the existing location', async () => {
    const put = await putEvse(LOC_ID, 'EVSE-003', {
      uid: 'EVSE-003',
      evse_id: 'FR*CPO*E000000003',
      status: 'AVAILABLE',
      capabilities: ['RFID_READER', 'REMOTE_START_STOP_CAPABLE'],
      connectors: [
        {
          id: '1',
          standard: 'IEC_62196_T2',
          format: 'CABLE',
          power_type: 'AC_1_PHASE',
          max_voltage: 230,
          max_amperage: 16,
          max_electric_power: 3680,
          tariff_ids: [tid('005')],
          last_updated: '2025-02-01T08:00:00Z',
        },
      ],
      floor_level: '1',
      physical_reference: 'C3',
      parking_restrictions: ['EV_ONLY'],
      last_updated: '2025-02-01T08:00:00Z',
    });
    expect(put.status).toBe(200);

    const get = await getEvse(LOC_ID, 'EVSE-003');
    expect(get.status).toBe(200);
    expect(get.data.data.uid).toBe('EVSE-003');
    expect(get.data.data.status).toBe('AVAILABLE');
    expect(get.data.data.floor_level).toBe('1');
    expect(get.data.data.physical_reference).toBe('C3');
    expect(get.data.data.capabilities).toContain('RFID_READER');
    expect(get.data.data.parking_restrictions).toContain('EV_ONLY');
    expect(get.data.data.connectors).toHaveLength(1);
    expect(get.data.data.connectors[0].standard).toBe('IEC_62196_T2');
    expect(get.data.data.connectors[0].tariff_ids).toContain(tid('005'));

    const locGet = await getLocation(LOC_ID);
    expect(locGet.data.data.evses).toHaveLength(3);
  });

  it('PUTs a standalone second connector onto EVSE-003', async () => {
    const put = await putConnector(LOC_ID, 'EVSE-003', '2', {
      id: '2',
      standard: 'DOMESTIC_F',
      format: 'SOCKET',
      power_type: 'AC_1_PHASE',
      max_voltage: 230,
      max_amperage: 10,
      max_electric_power: 2300,
      tariff_ids: [tid('006')],
      last_updated: '2025-02-01T09:00:00Z',
    });
    expect(put.status).toBe(200);

    const get = await getConnector(LOC_ID, 'EVSE-003', '2');
    expect(get.status).toBe(200);
    expect(get.data.data.id).toBe('2');
    expect(get.data.data.standard).toBe('DOMESTIC_F');
    expect(get.data.data.max_voltage).toBe(230);
    expect(get.data.data.max_amperage).toBe(10);
    expect(get.data.data.max_electric_power).toBe(2300);
    expect(get.data.data.tariff_ids).toContain(tid('006'));
  });
});

describe('PATCH semantics on location and EVSE', () => {
  const LOC_ID = `LOC-PATCH-BASIC-${RUN_ID}`;

  beforeAll(async () => {
    const put = await putLocation(LOC_ID, fullLocationBody(LOC_ID));
    expect(put.status).toBe(200);
  });

  it('PATCHes location fields, leaving other fields unchanged', async () => {
    const patch = await patchLocation(LOC_ID, {
      name: 'Paris Charging Hub UPDATED',
      parking_type: 'PARKING_GARAGE',
      last_updated: '2025-03-01T12:00:00Z',
    });
    expect(patch.status).toBe(200);
    expect(patch.data.status_code).toBe(1000);

    const get = await getLocation(LOC_ID);
    expect(get.data.data.name).toBe('Paris Charging Hub UPDATED');
    expect(get.data.data.parking_type).toBe('PARKING_GARAGE');
    // unchanged
    expect(get.data.data.city).toBe('Paris');
    expect(get.data.data.country).toBe('FRA');
    expect(get.data.data.operator.name).toBe('108Charge');
    expect(get.data.data.energy_mix.supplier_name).toBe('GreenPower FR');
    expect(get.data.data.evses).toHaveLength(2);
  });

  it('PATCHes EVSE status, leaving other EVSE fields unchanged', async () => {
    const patch = await patchEvse(LOC_ID, 'EVSE-001', {
      status: 'CHARGING',
      last_updated: '2025-03-01T13:00:00Z',
    });
    expect(patch.status).toBe(200);

    const get = await getEvse(LOC_ID, 'EVSE-001');
    expect(get.data.data.status).toBe('CHARGING');
    expect(get.data.data.floor_level).toBe('-1');
    expect(get.data.data.physical_reference).toBe('A1');
    expect(get.data.data.capabilities).toContain('RFID_READER');
    expect(get.data.data.connectors).toHaveLength(2);
  });

  it('marks an EVSE REMOVED via PATCH — it stays GET-able (never hard-deleted)', async () => {
    const patch = await patchEvse(LOC_ID, 'EVSE-002', {
      status: 'REMOVED',
      last_updated: '2025-03-01T14:00:00Z',
    });
    expect(patch.status).toBe(200);

    const get = await getEvse(LOC_ID, 'EVSE-002');
    expect(get.status).toBe(200);
    expect(get.data.data.status).toBe('REMOVED');
  });

  it('PATCHes connector tariff_ids, leaving other connector fields unchanged', async () => {
    const patch = await patchConnector(LOC_ID, 'EVSE-001', '1', {
      tariff_ids: [tid('NEW-001')],
      last_updated: '2025-03-01T15:00:00Z',
    });
    expect(patch.status).toBe(200);

    const get = await getConnector(LOC_ID, 'EVSE-001', '1');
    expect(get.data.data.tariff_ids).toContain(tid('NEW-001'));
    expect(get.data.data.standard).toBe('IEC_62196_T2');
    expect(get.data.data.max_voltage).toBe(230);
    expect(get.data.data.max_amperage).toBe(32);
  });
});

describe('connector round trip, PUT replace, PATCH partial updates, idempotency, cascade', () => {
  const LOC_ID = `LOC-CONN-${RUN_ID}`;

  const baseLocationBody = {
    country_code: CPO_COUNTRY,
    party_id: CPO_PARTY,
    id: LOC_ID,
    publish: true,
    name: 'Connector Test Location',
    address: '42 Avenue des Tests',
    city: 'Lyon',
    postal_code: '69001',
    country: 'FRA',
    coordinates: { latitude: '45.764043', longitude: '4.835659' },
    parking_type: 'PARKING_GARAGE',
    time_zone: 'Europe/Paris',
    operator: { name: 'TestCPO', website: 'https://testcpo.example.com' },
    evses: [
      {
        uid: 'EVSE-A',
        evse_id: 'FR*CPO*EA00000001',
        status: 'AVAILABLE',
        capabilities: [
          'RFID_READER',
          'REMOTE_START_STOP_CAPABLE',
          'RESERVABLE',
        ],
        connectors: [
          {
            id: '1',
            standard: 'IEC_62196_T2',
            format: 'SOCKET',
            power_type: 'AC_3_PHASE',
            max_voltage: 230,
            max_amperage: 32,
            max_electric_power: 22000,
            tariff_ids: [tid('A1'), tid('A2')],
            terms_and_conditions: 'https://example.com/terms',
            last_updated: '2025-01-01T00:00:00Z',
          },
          {
            id: '2',
            standard: 'IEC_62196_T2_COMBO',
            format: 'CABLE',
            power_type: 'DC',
            max_voltage: 400,
            max_amperage: 125,
            max_electric_power: 50000,
            tariff_ids: [tid('B1')],
            last_updated: '2025-01-01T00:00:00Z',
          },
        ],
        floor_level: '-1',
        physical_reference: 'P1',
        parking_restrictions: ['EV_ONLY'],
        last_updated: '2025-01-01T00:00:00Z',
      },
    ],
    last_updated: '2025-01-01T00:00:00Z',
  };

  beforeAll(async () => {
    const put = await putLocation(LOC_ID, baseLocationBody);
    expect(put.status).toBe(200);
  });

  it('GETs connector 1 with all fields populated', async () => {
    const get = await getConnector(LOC_ID, 'EVSE-A', '1');
    expect(get.status).toBe(200);
    expect(get.data.status_code).toBe(1000);
    expect(get.data.data.standard).toBe('IEC_62196_T2');
    expect(get.data.data.max_voltage).toBe(230);
    expect(get.data.data.max_amperage).toBe(32);
    expect(get.data.data.max_electric_power).toBe(22000);
    expect(get.data.data.terms_and_conditions).toBe(
      'https://example.com/terms',
    );
    expect(get.data.data.tariff_ids).toEqual(
      expect.arrayContaining([tid('A1'), tid('A2')]),
    );
  });

  it('GETs connector 2 with all fields populated', async () => {
    const get = await getConnector(LOC_ID, 'EVSE-A', '2');
    expect(get.status).toBe(200);
    expect(get.data.data.standard).toBe('IEC_62196_T2_COMBO');
    expect(get.data.data.max_voltage).toBe(400);
    expect(get.data.data.tariff_ids).toContain(tid('B1'));
  });

  it('PUT replaces connector 1 entirely, dropping the old tariff_ids', async () => {
    const put = await putConnector(LOC_ID, 'EVSE-A', '1', {
      id: '1',
      standard: 'IEC_62196_T2',
      format: 'CABLE',
      power_type: 'AC_1_PHASE',
      max_voltage: 230,
      max_amperage: 16,
      max_electric_power: 3680,
      tariff_ids: [tid('REPLACED')],
      terms_and_conditions: 'https://example.com/new-terms',
      last_updated: '2025-02-01T10:00:00Z',
    });
    expect(put.status).toBe(200);

    const get = await getConnector(LOC_ID, 'EVSE-A', '1');
    expect(get.data.data.format).toBe('CABLE');
    expect(get.data.data.power_type).toBe('AC_1_PHASE');
    expect(get.data.data.max_amperage).toBe(16);
    expect(get.data.data.terms_and_conditions).toBe(
      'https://example.com/new-terms',
    );
    expect(get.data.data.tariff_ids).toContain(tid('REPLACED'));
    expect(get.data.data.tariff_ids).not.toContain(tid('A1'));
    expect(get.data.data.tariff_ids).not.toContain(tid('A2'));
  });

  it('PATCH updates only tariff_ids, leaving other connector fields unchanged', async () => {
    const patch = await patchConnector(LOC_ID, 'EVSE-A', '1', {
      tariff_ids: [tid('NEW-X'), tid('NEW-Y')],
      last_updated: '2025-02-15T08:00:00Z',
    });
    expect(patch.status).toBe(200);

    const get = await getConnector(LOC_ID, 'EVSE-A', '1');
    expect(get.data.data.tariff_ids).toEqual(
      expect.arrayContaining([tid('NEW-X'), tid('NEW-Y')]),
    );
    expect(get.data.data.tariff_ids).not.toContain(tid('REPLACED'));
    expect(get.data.data.standard).toBe('IEC_62196_T2');
    expect(get.data.data.format).toBe('CABLE');
    expect(get.data.data.max_amperage).toBe(16);
    expect(get.data.data.terms_and_conditions).toBe(
      'https://example.com/new-terms',
    );
  });

  it('PATCH updates only power fields, leaving tariff_ids unchanged', async () => {
    const patch = await patchConnector(LOC_ID, 'EVSE-A', '1', {
      max_voltage: 400,
      max_amperage: 63,
      max_electric_power: 43000,
      last_updated: '2025-02-15T09:00:00Z',
    });
    expect(patch.status).toBe(200);

    const get = await getConnector(LOC_ID, 'EVSE-A', '1');
    expect(get.data.data.max_voltage).toBe(400);
    expect(get.data.data.max_amperage).toBe(63);
    expect(get.data.data.max_electric_power).toBe(43000);
    expect(get.data.data.tariff_ids).toContain(tid('NEW-X'));
  });

  it('PATCH is idempotent: setting the same tariff_ids twice does not duplicate them', async () => {
    await patchConnector(LOC_ID, 'EVSE-A', '2', {
      tariff_ids: [tid('IDEMPOTENT')],
      last_updated: '2025-03-01T10:00:00Z',
    });
    const repeat = await patchConnector(LOC_ID, 'EVSE-A', '2', {
      tariff_ids: [tid('IDEMPOTENT')],
      last_updated: '2025-03-01T11:00:00Z',
    });
    expect(repeat.status).toBe(200);

    const get = await getConnector(LOC_ID, 'EVSE-A', '2');
    expect(get.data.data.tariff_ids).toHaveLength(1);
    expect(get.data.data.tariff_ids).toContain(tid('IDEMPOTENT'));
  });

  it('cascades last_updated from connector patch up to EVSE and Location', async () => {
    const locBefore = await getLocation(LOC_ID);
    const evseBefore = await getEvse(LOC_ID, 'EVSE-A');
    const locTsBefore = locBefore.data.data.last_updated;
    const evseTsBefore = evseBefore.data.data.last_updated;

    const patch = await patchConnector(LOC_ID, 'EVSE-A', '1', {
      tariff_ids: [tid('CASCADE')],
      last_updated: '2025-06-01T12:00:00Z',
    });
    expect(patch.status).toBe(200);

    const locAfter = await getLocation(LOC_ID);
    const evseAfter = await getEvse(LOC_ID, 'EVSE-A');
    expect(locAfter.data.data.last_updated).not.toBe(locTsBefore);
    expect(evseAfter.data.data.last_updated).not.toBe(evseTsBefore);
  });

  it('cascades last_updated from EVSE patch up to Location only', async () => {
    const locBefore = await getLocation(LOC_ID);
    const locTsBefore = locBefore.data.data.last_updated;

    const patch = await patchEvse(LOC_ID, 'EVSE-A', {
      status: 'OUT_OF_ORDER',
      last_updated: '2025-07-01T09:00:00Z',
    });
    expect(patch.status).toBe(200);

    const locAfter = await getLocation(LOC_ID);
    expect(locAfter.data.data.last_updated).not.toBe(locTsBefore);

    const evseAfter = await getEvse(LOC_ID, 'EVSE-A');
    expect(evseAfter.data.data.status).toBe('OUT_OF_ORDER');
  });

  it('PATCH updates only EVSE capabilities, leaving status/connectors unchanged', async () => {
    const patch = await patchEvse(LOC_ID, 'EVSE-A', {
      capabilities: ['CHARGING_PROFILE_CAPABLE', 'CREDIT_CARD_PAYABLE'],
      last_updated: '2025-07-02T10:00:00Z',
    });
    expect(patch.status).toBe(200);

    const get = await getEvse(LOC_ID, 'EVSE-A');
    expect(get.data.data.capabilities).toEqual(
      expect.arrayContaining([
        'CHARGING_PROFILE_CAPABLE',
        'CREDIT_CARD_PAYABLE',
      ]),
    );
    expect(get.data.data.capabilities).not.toContain('RFID_READER');
    expect(get.data.data.status).toBe('OUT_OF_ORDER');
    expect(get.data.data.floor_level).toBe('-1');
    expect(get.data.data.connectors).toHaveLength(2);
  });

  it('PATCH updates only EVSE parking_restrictions', async () => {
    const patch = await patchEvse(LOC_ID, 'EVSE-A', {
      parking_restrictions: ['EV_ONLY', 'CUSTOMERS'],
      last_updated: '2025-07-02T11:00:00Z',
    });
    expect(patch.status).toBe(200);

    const get = await getEvse(LOC_ID, 'EVSE-A');
    expect(get.data.data.parking_restrictions).toEqual(
      expect.arrayContaining(['EV_ONLY', 'CUSTOMERS']),
    );
    expect(get.data.data.capabilities).toContain('CHARGING_PROFILE_CAPABLE');
  });

  it('PATCH updates only Location operator, leaving address unchanged', async () => {
    const patch = await patchLocation(LOC_ID, {
      operator: {
        name: 'NewOperator',
        website: 'https://newoperator.example.com',
      },
      last_updated: '2025-08-01T08:00:00Z',
    });
    expect(patch.status).toBe(200);

    const get = await getLocation(LOC_ID);
    expect(get.data.data.operator.name).toBe('NewOperator');
    expect(get.data.data.name).toBe('Connector Test Location');
    expect(get.data.data.address).toBe('42 Avenue des Tests');
    expect(get.data.data.city).toBe('Lyon');
    expect(get.data.data.parking_type).toBe('PARKING_GARAGE');
  });

  it('PATCH toggles publish false then true', async () => {
    const off = await patchLocation(LOC_ID, {
      publish: false,
      last_updated: '2025-08-01T09:00:00Z',
    });
    expect(off.status).toBe(200);
    const getOff = await getLocation(LOC_ID);
    expect(getOff.data.data.publish).toBe(false);
    expect(getOff.data.data.operator.name).toBe('NewOperator');

    const on = await patchLocation(LOC_ID, {
      publish: true,
      last_updated: '2025-08-01T10:00:00Z',
    });
    expect(on.status).toBe(200);
    const getOn = await getLocation(LOC_ID);
    expect(getOn.data.data.publish).toBe(true);
  });

  it('adds a third connector via PUT then PATCHes it', async () => {
    const put = await putConnector(LOC_ID, 'EVSE-A', '3', {
      id: '3',
      standard: 'CHADEMO',
      format: 'CABLE',
      power_type: 'DC',
      max_voltage: 500,
      max_amperage: 100,
      max_electric_power: 50000,
      tariff_ids: [tid('C1')],
      last_updated: '2025-09-01T08:00:00Z',
    });
    expect(put.status).toBe(200);

    const getEvseResp = await getEvse(LOC_ID, 'EVSE-A');
    expect(getEvseResp.data.data.connectors).toHaveLength(3);

    const patch = await patchConnector(LOC_ID, 'EVSE-A', '3', {
      max_amperage: 200,
      max_electric_power: 100000,
      last_updated: '2025-09-01T09:00:00Z',
    });
    expect(patch.status).toBe(200);

    const get = await getConnector(LOC_ID, 'EVSE-A', '3');
    expect(get.data.data.max_amperage).toBe(200);
    expect(get.data.data.max_electric_power).toBe(100000);
    expect(get.data.data.standard).toBe('CHADEMO');
    expect(get.data.data.max_voltage).toBe(500);
    expect(get.data.data.tariff_ids).toContain(tid('C1'));
  });
});

describe('error paths', () => {
  const LOC_ID = `LOC-ERR-${RUN_ID}`;

  beforeAll(async () => {
    const put = await putLocation(LOC_ID, {
      country_code: CPO_COUNTRY,
      party_id: CPO_PARTY,
      id: LOC_ID,
      publish: true,
      name: 'Error Path Location',
      address: '1 Rue Erreur',
      city: 'Paris',
      country: 'FRA',
      coordinates: { latitude: '48.8', longitude: '2.3' },
      parking_type: 'ON_STREET',
      time_zone: 'Europe/Paris',
      evses: [
        {
          uid: 'EVSE-A',
          evse_id: 'FR*CPO*EAERR00001',
          status: 'AVAILABLE',
          connectors: [
            {
              id: '1',
              standard: 'IEC_62196_T2',
              format: 'SOCKET',
              power_type: 'AC_3_PHASE',
              max_voltage: 230,
              max_amperage: 32,
              last_updated: '2025-01-01T00:00:00Z',
            },
          ],
          last_updated: '2025-01-01T00:00:00Z',
        },
      ],
      last_updated: '2025-01-01T00:00:00Z',
    });
    expect(put.status).toBe(200);
  });

  it('returns an OCPI error (HTTP 200) for a PATCH missing last_updated', async () => {
    const resp = await patchLocation(LOC_ID, {
      name: 'Should fail - no last_updated',
    });
    expect(resp.status).toBe(200);
    assertOcpiError(resp.data);
  });

  it('returns an OCPI error (HTTP 200) for GET on an unknown location', async () => {
    const resp = await getLocation('LOC-NONEXISTENT-XYZ');
    expect(resp.status).toBe(200);
    assertOcpiError(resp.data);
  });

  it('returns an OCPI error (HTTP 200) for GET on an unknown EVSE', async () => {
    const resp = await getEvse(LOC_ID, 'EVSE-999');
    expect(resp.status).toBe(200);
    assertOcpiError(resp.data);
  });

  it('returns an OCPI error (HTTP 200) for GET on an unknown connector', async () => {
    const resp = await getConnector(LOC_ID, 'EVSE-A', '99');
    expect(resp.status).toBe(200);
    assertOcpiError(resp.data);
  });

  it('returns an OCPI error for PATCH connector without last_updated', async () => {
    const resp = await patchConnector(LOC_ID, 'EVSE-A', '1', {
      tariff_ids: ['SHOULD-FAIL'],
    });
    expect(resp.status).toBe(200);
    assertOcpiError(resp.data);
  });

  it('returns HTTP 404 for PATCH EVSE without last_updated on an unknown EVSE', async () => {
    // patchEvseByCountryParty is the one route that maps a
    // ClientUnknownLocation error to HTTP 404 (see LocationsModuleApi).
    const resp = await patchEvse(LOC_ID, 'EVSE-UNKNOWN', {
      status: 'AVAILABLE',
      last_updated: '2025-09-01T10:00:00Z',
    });
    expect(resp.status).toBe(404);
    assertOcpiError(resp.data);
  });

  it('returns an OCPI error for PATCH connector on a non-existent EVSE', async () => {
    const resp = await patchConnector(LOC_ID, 'EVSE-DOES-NOT-EXIST', '1', {
      tariff_ids: ['SHOULD-FAIL'],
      last_updated: '2025-09-01T10:00:00Z',
    });
    expect(resp.status).toBe(200);
    assertOcpiError(resp.data);
  });

  it('returns an OCPI error for PATCH connector on a non-existent location', async () => {
    const resp = await patchConnector('LOC-DOES-NOT-EXIST-XYZ', 'EVSE-A', '1', {
      tariff_ids: ['SHOULD-FAIL'],
      last_updated: '2025-09-01T10:00:00Z',
    });
    expect(resp.status).toBe(200);
    assertOcpiError(resp.data);
  });
});

describe('DELETE is not supported on the Locations receiver interface', () => {
  const LOC_ID = `LOC-DELETE-${RUN_ID}`;

  it('returns HTTP 405 for DELETE on a location', async () => {
    // OCPI has no DELETE for locations; removal is modeled via PATCHing an
    // EVSE's status to REMOVED. routing-controllers' method-not-matched
    // path is mapped to 405 by OcpiExceptionHandler.
    const resp = await http.delete(locUrl(LOC_ID), {
      headers: ocpiCpoHeaders(),
    });
    expect(resp.status).toBe(405);
  });
});
