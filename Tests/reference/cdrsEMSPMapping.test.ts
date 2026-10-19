// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

/**
 * CDRs module OCPI 2.2.1 - eMSP Receiver Interface tests.
 *
 * Converted from Tests/cdrs-test-curl.sh.
 *
 * The raw bash script authenticates as a direct (non-hub) CPO partner with
 * party_id "108" and posts CDRs with country_code/party_id "FR"/"108". That
 * tenant partner does not exist in the seeded test DB — only FR/CPO (see
 * seeders/20250806120002-default-tenant-partner.ts, tenantPartnerCPO) is
 * seeded as a direct partner. This suite uses FR/CPO instead, via the shared
 * `ocpiCpoHeaders()` helper, and CDR bodies carry country_code/party_id
 * "FR"/"CPO" to match — required by AuthMiddleware, which validates the
 * OCPI-from-* headers against the authenticated tenant partner's own
 * identity when no roaming partner match is found.
 *
 * CDRs are immutable: `03_Modules/Cdrs/src/module/CdrsModuleApi.ts` only
 * exposes GET (list + by id) and POST (create) — no PUT/PATCH/DELETE route
 * exists at all.
 */

import { describe, expect, it } from '@jest/globals';
import { randomUUID } from 'crypto';
import { http, ocpiCpoHeaders } from '../../../Tests/helpers/ocpi-client';

const OCPI_BASE = process.env.OCPI_BASE ?? 'http://localhost:8085/ocpi';
const OCPI_VERSION = process.env.OCPI_VERSION ?? '2.2.1';
const CDR_RECEIVER_URL = `${OCPI_BASE}/emsp/${OCPI_VERSION}/cdrs`;

const CPO_COUNTRY = 'FR';
const CPO_PARTY = 'CPO';

// Unique per test-run so re-running this suite never collides with CDRs
// left behind by a previous run (CDRs cannot be deleted).
const RUN_ID = randomUUID().slice(0, 8);

async function postCdr(body: unknown) {
  return http.post(CDR_RECEIVER_URL, body, { headers: ocpiCpoHeaders() });
}

async function getCdr(location: string) {
  return http.get(location, { headers: ocpiCpoHeaders() });
}

function locationOf(resp: { headers: Record<string, unknown> }): string {
  const location = resp.headers['location'];
  if (typeof location !== 'string') {
    throw new Error('Expected Location header on CDR POST response');
  }
  return location;
}

function minimalCdr(id: string) {
  return {
    country_code: CPO_COUNTRY,
    party_id: CPO_PARTY,
    id,
    start_date_time: '2025-03-10T08:00:00Z',
    end_date_time: '2025-03-10T09:00:00Z',
    session_id: `SESSION-${id}`,
    cdr_token: {
      country_code: 'DE',
      party_id: 'TNM',
      uid: `RFID-${id}`,
      type: 'RFID',
      contract_id: 'DE8ACC12E46L89',
    },
    auth_method: 'WHITELIST',
    cdr_location: {
      id: `LOC-${id}`,
      address: '1 Rue de la Paix',
      city: 'Paris',
      country: 'FRA',
      coordinates: { latitude: '48.869888', longitude: '2.331440' },
      evse_uid: `EVSE-${id}`,
      evse_id: 'BE*BEC*E041503001',
      connector_id: '1',
      connector_standard: 'IEC_62196_T2',
      connector_format: 'SOCKET',
      connector_power_type: 'AC_3_PHASE',
    },
    currency: 'EUR',
    tariffs: [
      {
        country_code: CPO_COUNTRY,
        party_id: CPO_PARTY,
        id: `TARIFF-${id}`,
        currency: 'EUR',
        elements: [
          {
            price_components: [
              { type: 'ENERGY', price: 0.25, vat: 20.0, step_size: 1 },
            ],
          },
        ],
        last_updated: '2025-01-01T00:00:00Z',
      },
    ],
    charging_periods: [
      {
        start_date_time: '2025-03-10T08:00:00Z',
        dimensions: [{ type: 'ENERGY', volume: 10.5 }],
        tariff_id: `TARIFF-${id}`,
      },
    ],
    total_cost: { excl_vat: 2.625, incl_vat: 3.15 },
    total_energy: 10.5,
    total_time: 1.0,
    last_updated: '2025-03-10T09:05:00Z',
  };
}

function fullCdr(id: string) {
  return {
    country_code: CPO_COUNTRY,
    party_id: CPO_PARTY,
    id,
    start_date_time: '2025-04-01T14:00:00Z',
    end_date_time: '2025-04-01T16:30:00Z',
    session_id: `SESSION-${id}`,
    cdr_token: {
      country_code: 'NL',
      party_id: 'ALX',
      uid: `APP-TOKEN-${id}`,
      type: 'APP_USER',
      contract_id: `NL-ALX-APP-${id}`,
    },
    auth_method: 'AUTH_REQUEST',
    authorization_reference: `AUTH-REF-${id}`,
    cdr_location: {
      id: `LOC-${id}`,
      name: 'Brussels Central Station',
      address: "Carrefour de l'Europe 2",
      city: 'Brussels',
      postal_code: '1000',
      state: 'Brussels',
      country: 'BEL',
      coordinates: { latitude: '50.846557', longitude: '4.356470' },
      evse_uid: `EVSE-${id}`,
      evse_id: 'BE*BEC*E041503099',
      connector_id: '2',
      connector_standard: 'IEC_62196_T2_COMBO',
      connector_format: 'CABLE',
      connector_power_type: 'DC',
    },
    meter_id: 'METER-FULL-ABC123',
    currency: 'EUR',
    tariffs: [
      {
        country_code: CPO_COUNTRY,
        party_id: CPO_PARTY,
        id: `TARIFF-${id}`,
        currency: 'EUR',
        elements: [
          {
            price_components: [
              { type: 'FLAT', price: 0.5, vat: 21.0, step_size: 1 },
            ],
          },
          {
            price_components: [
              { type: 'ENERGY', price: 0.3, vat: 21.0, step_size: 1 },
            ],
          },
          {
            price_components: [
              { type: 'PARKING_TIME', price: 0.1, vat: 21.0, step_size: 300 },
            ],
          },
        ],
        last_updated: '2025-01-15T00:00:00Z',
      },
    ],
    charging_periods: [
      {
        start_date_time: '2025-04-01T14:00:00Z',
        dimensions: [
          { type: 'ENERGY', volume: 22.5 },
          { type: 'MAX_CURRENT', volume: 63.0 },
        ],
        tariff_id: `TARIFF-${id}`,
      },
      {
        start_date_time: '2025-04-01T15:45:00Z',
        dimensions: [{ type: 'PARKING_TIME', volume: 0.75 }],
        tariff_id: `TARIFF-${id}`,
      },
    ],
    total_cost: { excl_vat: 7.925, incl_vat: 9.589 },
    total_fixed_cost: { excl_vat: 0.5, incl_vat: 0.605 },
    total_energy: 22.5,
    total_energy_cost: { excl_vat: 6.75, incl_vat: 8.168 },
    total_time: 2.5,
    total_time_cost: { excl_vat: 0.0, incl_vat: 0.0 },
    total_parking_time: 0.75,
    total_parking_cost: { excl_vat: 0.075, incl_vat: 0.091 },
    remark: 'DC fast charge at Brussels Central',
    invoice_reference_id: `INV-${id}`,
    last_updated: '2025-04-01T16:35:00Z',
  };
}

function originalCdr(id: string) {
  return {
    country_code: CPO_COUNTRY,
    party_id: CPO_PARTY,
    id,
    start_date_time: '2025-05-01T10:00:00Z',
    end_date_time: '2025-05-01T11:00:00Z',
    cdr_token: {
      country_code: 'DE',
      party_id: 'EMP',
      uid: `RFID-${id}`,
      type: 'RFID',
      contract_id: `DE-EMP-${id}`,
    },
    auth_method: 'WHITELIST',
    cdr_location: {
      id: `LOC-${id}`,
      address: '10 Avenue des Champs',
      city: 'Paris',
      country: 'FRA',
      coordinates: { latitude: '48.873792', longitude: '2.295972' },
      evse_uid: `EVSE-${id}`,
      evse_id: 'BE*BEC*E041503010',
      connector_id: '1',
      connector_standard: 'IEC_62196_T2',
      connector_format: 'SOCKET',
      connector_power_type: 'AC_3_PHASE',
    },
    currency: 'EUR',
    tariffs: [
      {
        country_code: CPO_COUNTRY,
        party_id: CPO_PARTY,
        id: `TARIFF-${id}`,
        currency: 'EUR',
        elements: [
          {
            price_components: [
              { type: 'TIME', price: 2.0, vat: 10.0, step_size: 300 },
            ],
          },
        ],
        last_updated: '2025-01-01T00:00:00Z',
      },
    ],
    charging_periods: [
      {
        start_date_time: '2025-05-01T10:00:00Z',
        dimensions: [{ type: 'TIME', volume: 1.0 }],
        tariff_id: `TARIFF-${id}`,
      },
    ],
    total_cost: { excl_vat: 2.0, incl_vat: 2.2 },
    total_energy: 0.0,
    total_time: 1.0,
    last_updated: '2025-05-01T11:05:00Z',
  };
}

function creditCdr(id: string, creditOf: ReturnType<typeof originalCdr>) {
  return {
    ...creditOf,
    id,
    total_cost: { excl_vat: -2.0, incl_vat: -2.2 },
    credit: true,
    credit_reference_id: creditOf.id,
    last_updated: '2025-05-05T09:00:00Z',
  };
}

function multiPeriodCdr(id: string) {
  return {
    country_code: CPO_COUNTRY,
    party_id: CPO_PARTY,
    id,
    start_date_time: '2025-06-01T16:00:00Z',
    end_date_time: '2025-06-01T19:00:00Z',
    session_id: `SESSION-${id}`,
    cdr_token: {
      country_code: CPO_COUNTRY,
      party_id: 'MSP',
      uid: `RFID-${id}`,
      type: 'RFID',
      contract_id: `FR-MSP-${id}`,
    },
    auth_method: 'WHITELIST',
    cdr_location: {
      id: `LOC-${id}`,
      address: '5 Place de la Republique',
      city: 'Lyon',
      country: 'FRA',
      coordinates: { latitude: '45.766944', longitude: '4.833611' },
      evse_uid: `EVSE-${id}`,
      evse_id: 'BE*BEC*E041503020',
      connector_id: '3',
      connector_standard: 'IEC_62196_T2',
      connector_format: 'SOCKET',
      connector_power_type: 'AC_3_PHASE',
    },
    currency: 'EUR',
    tariffs: [
      {
        country_code: CPO_COUNTRY,
        party_id: CPO_PARTY,
        id: `TARIFF-${id}`,
        currency: 'EUR',
        elements: [
          {
            price_components: [
              { type: 'ENERGY', price: 0.2, vat: 20.0, step_size: 1 },
            ],
            restrictions: { end_time: '17:00' },
          },
          {
            price_components: [
              { type: 'ENERGY', price: 0.27, vat: 20.0, step_size: 1 },
            ],
            restrictions: { start_time: '17:00' },
          },
        ],
        last_updated: '2025-01-01T00:00:00Z',
      },
    ],
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
        dimensions: [
          { type: 'ENERGY', volume: 1.1 },
          { type: 'MAX_CURRENT', volume: 16.0 },
        ],
        tariff_id: `TARIFF-${id}`,
      },
      {
        start_date_time: '2025-06-01T17:30:00Z',
        dimensions: [{ type: 'PARKING_TIME', volume: 1.5 }],
        tariff_id: `TARIFF-${id}`,
      },
    ],
    total_cost: { excl_vat: 1.157, incl_vat: 1.388 },
    total_energy: 5.4,
    total_energy_cost: { excl_vat: 1.157, incl_vat: 1.388 },
    total_time: 3.0,
    total_parking_time: 1.5,
    last_updated: '2025-06-01T19:05:00Z',
  };
}

function signedCdr(id: string) {
  return {
    country_code: CPO_COUNTRY,
    party_id: CPO_PARTY,
    id,
    start_date_time: '2025-07-01T09:00:00Z',
    end_date_time: '2025-07-01T10:00:00Z',
    session_id: `SESSION-${id}`,
    cdr_token: {
      country_code: 'DE',
      party_id: 'EMP',
      uid: `RFID-${id}`,
      type: 'RFID',
      contract_id: `DE-EMP-${id}`,
    },
    auth_method: 'WHITELIST',
    cdr_location: {
      id: `LOC-${id}`,
      address: 'Unter den Linden 1',
      city: 'Berlin',
      country: 'DEU',
      coordinates: { latitude: '52.516667', longitude: '13.383333' },
      evse_uid: `EVSE-${id}`,
      evse_id: 'DE*CPO*E041503030',
      connector_id: '1',
      connector_standard: 'IEC_62196_T2_COMBO',
      connector_format: 'CABLE',
      connector_power_type: 'DC',
    },
    currency: 'EUR',
    tariffs: [
      {
        country_code: 'DE',
        party_id: 'CPO',
        id: `TARIFF-${id}`,
        currency: 'EUR',
        elements: [
          {
            price_components: [
              { type: 'ENERGY', price: 0.35, vat: 19.0, step_size: 1 },
            ],
          },
        ],
        last_updated: '2025-01-01T00:00:00Z',
      },
    ],
    charging_periods: [
      {
        start_date_time: '2025-07-01T09:00:00Z',
        dimensions: [{ type: 'ENERGY', volume: 30.0 }],
        tariff_id: `TARIFF-${id}`,
      },
    ],
    signed_data: {
      encoding_method: 'OCMF',
      encoding_method_version: 1,
      public_key: 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEfakePublicKeyBase64==',
      signed_values: [
        {
          nature: 'Start',
          plain_data: 'START|2025-07-01T09:00:00Z|0.000kWh',
          signed_data: 'c2lnbmVkX3N0YXJ0X2RhdGFfYmFzZTY0X2VuY29kZWRfZmFrZQ==',
        },
        {
          nature: 'End',
          plain_data: 'END|2025-07-01T10:00:00Z|30.000kWh',
          signed_data: 'c2lnbmVkX2VuZF9kYXRhX2Jhc2U2NF9lbmNvZGVkX2Zha2U=',
        },
      ],
      url: `https://example.com/verify/${id}`,
    },
    total_cost: { excl_vat: 10.5, incl_vat: 12.495 },
    total_energy: 30.0,
    total_time: 1.0,
    last_updated: '2025-07-01T10:05:00Z',
  };
}

function homeChargingCdr(id: string) {
  return {
    country_code: CPO_COUNTRY,
    party_id: CPO_PARTY,
    id,
    start_date_time: '2025-08-01T22:00:00Z',
    end_date_time: '2025-08-02T06:00:00Z',
    cdr_token: {
      country_code: 'NL',
      party_id: 'DRV',
      uid: `APP-${id}`,
      type: 'APP_USER',
      contract_id: `NL-DRV-${id}`,
    },
    auth_method: 'COMMAND',
    cdr_location: {
      id: `LOC-${id}`,
      address: 'Private Road 7',
      city: 'Amsterdam',
      country: 'NLD',
      coordinates: { latitude: '52.370216', longitude: '4.895168' },
      evse_uid: `EVSE-${id}`,
      evse_id: 'NL*DRV*EHOME001',
      connector_id: '1',
      connector_standard: 'IEC_62196_T2',
      connector_format: 'SOCKET',
      connector_power_type: 'AC_1_PHASE',
    },
    currency: 'EUR',
    tariffs: [
      {
        country_code: CPO_COUNTRY,
        party_id: CPO_PARTY,
        id: `TARIFF-${id}`,
        currency: 'EUR',
        elements: [
          {
            price_components: [
              { type: 'ENERGY', price: 0.22, vat: 21.0, step_size: 1 },
            ],
          },
        ],
        last_updated: '2025-01-01T00:00:00Z',
      },
    ],
    charging_periods: [
      {
        start_date_time: '2025-08-01T22:00:00Z',
        dimensions: [{ type: 'ENERGY', volume: 40.0 }],
        tariff_id: `TARIFF-${id}`,
      },
    ],
    total_cost: { excl_vat: 8.8, incl_vat: 10.648 },
    total_energy: 40.0,
    total_time: 8.0,
    home_charging_compensation: true,
    last_updated: '2025-08-02T06:05:00Z',
  };
}

function reservationCdr(id: string) {
  return {
    country_code: CPO_COUNTRY,
    party_id: CPO_PARTY,
    id,
    start_date_time: '2025-09-01T12:00:00Z',
    end_date_time: '2025-09-01T12:30:00Z',
    cdr_token: {
      country_code: 'DE',
      party_id: 'EMP',
      uid: `RFID-${id}`,
      type: 'RFID',
      contract_id: `DE-EMP-${id}`,
    },
    auth_method: 'COMMAND',
    authorization_reference: `RESERVENOW-REF-${id}`,
    cdr_location: {
      id: `LOC-${id}`,
      address: 'Station Road 1',
      city: 'Antwerp',
      country: 'BEL',
      coordinates: { latitude: '51.219448', longitude: '4.402464' },
      evse_uid: '#NA',
      evse_id: '#NA',
      connector_id: '#NA',
      connector_standard: 'IEC_62196_T2',
      connector_format: 'SOCKET',
      connector_power_type: 'AC_3_PHASE',
    },
    currency: 'EUR',
    tariffs: [
      {
        country_code: CPO_COUNTRY,
        party_id: CPO_PARTY,
        id: `TARIFF-${id}`,
        currency: 'EUR',
        elements: [
          {
            price_components: [
              { type: 'FLAT', price: 1.0, vat: 21.0, step_size: 1 },
            ],
          },
        ],
        last_updated: '2025-01-01T00:00:00Z',
      },
    ],
    charging_periods: [
      {
        start_date_time: '2025-09-01T12:00:00Z',
        dimensions: [{ type: 'RESERVATION_TIME', volume: 0.5 }],
        tariff_id: `TARIFF-${id}`,
      },
    ],
    total_cost: { excl_vat: 1.0, incl_vat: 1.21 },
    total_reservation_cost: { excl_vat: 1.0, incl_vat: 1.21 },
    total_energy: 0.0,
    total_time: 0.5,
    remark: 'Reservation expired without EV arriving',
    last_updated: '2025-09-01T12:35:00Z',
  };
}

function missingTotalCostCdr(id: string) {
  return {
    country_code: CPO_COUNTRY,
    party_id: CPO_PARTY,
    id,
    start_date_time: '2025-01-01T00:00:00Z',
    end_date_time: '2025-01-01T01:00:00Z',
    cdr_token: {
      country_code: 'DE',
      party_id: 'EMP',
      uid: `RFID-${id}`,
      type: 'RFID',
      contract_id: `DE-EMP-${id}`,
    },
    auth_method: 'WHITELIST',
    cdr_location: {
      id: `LOC-${id}`,
      address: 'Some Street 1',
      city: 'Berlin',
      country: 'DEU',
      coordinates: { latitude: '52.516667', longitude: '13.383333' },
      evse_uid: `EVSE-${id}`,
      evse_id: 'DE*CPO*E000000001',
      connector_id: '1',
      connector_standard: 'IEC_62196_T2',
      connector_format: 'SOCKET',
      connector_power_type: 'AC_3_PHASE',
    },
    currency: 'EUR',
    tariffs: [],
    charging_periods: [
      {
        start_date_time: '2025-01-01T00:00:00Z',
        dimensions: [{ type: 'ENERGY', volume: 5.0 }],
      },
    ],
    total_energy: 5.0,
    total_time: 1.0,
    last_updated: '2025-01-01T01:05:00Z',
  };
}

describe('eMSP receiver — CDR create + GET', () => {
  it('posts a minimal CDR and echoes matching data on GET', async () => {
    const id = `CDR-MINIMAL-${RUN_ID}`;
    const post = await postCdr(minimalCdr(id));
    expect(post.status).toBe(200);
    expect(post.data.status_code).toBe(1000);
    const location = locationOf(post);

    const get = await getCdr(location);
    expect(get.status).toBe(200);
    const data = get.data.data;

    expect(data.id).toBe(id);
    expect(data.country_code).toBe(CPO_COUNTRY);
    expect(data.party_id).toBe(CPO_PARTY);
    expect(data.session_id).toBe(`SESSION-${id}`);
    expect(data.auth_method).toBe('WHITELIST');
    expect(data.currency).toBe('EUR');

    expect(data.cdr_token.country_code).toBe('DE');
    expect(data.cdr_token.party_id).toBe('TNM');
    expect(data.cdr_token.type).toBe('RFID');

    expect(data.cdr_location.id).toBe(`LOC-${id}`);
    expect(data.cdr_location.address).toBe('1 Rue de la Paix');
    expect(data.cdr_location.connector_standard).toBe('IEC_62196_T2');
    expect(data.cdr_location.coordinates.latitude).toBe('48.869888');

    expect(data.tariffs).toHaveLength(1);
    expect(data.tariffs[0].elements[0].price_components[0].price).toBeCloseTo(
      0.25,
    );
    expect(data.tariffs[0].elements[0].price_components[0].vat).toBeCloseTo(
      20.0,
    );

    expect(data.charging_periods).toHaveLength(1);
    expect(data.charging_periods[0].dimensions[0].volume).toBeCloseTo(10.5);
    expect(data.charging_periods[0].tariff_id).toBe(`TARIFF-${id}`);

    expect(data.total_energy).toBeCloseTo(10.5);
    expect(data.total_time).toBeCloseTo(1.0);
    expect(data.total_cost.excl_vat).toBeCloseTo(2.625);
    expect(data.total_cost.incl_vat).toBeCloseTo(3.15);

    expect(data.meter_id ?? null).toBeNull();
    expect(data.credit ?? null).toBeNull();
    expect(data.credit_reference_id ?? null).toBeNull();
    expect(data.home_charging_compensation ?? null).toBeNull();
    expect(data.last_updated).toBeTruthy();
  });

  it('stores every optional field on a fully-populated CDR', async () => {
    const id = `CDR-FULL-${RUN_ID}`;
    const post = await postCdr(fullCdr(id));
    expect(post.status).toBe(200);

    const get = await getCdr(locationOf(post));
    expect(get.status).toBe(200);
    const data = get.data.data;

    expect(data.id).toBe(id);
    expect(data.cdr_token.type).toBe('APP_USER');
    expect(data.auth_method).toBe('AUTH_REQUEST');
    expect(data.authorization_reference).toBe(`AUTH-REF-${id}`);
    expect(data.cdr_location.name).toBe('Brussels Central Station');
    expect(data.cdr_location.postal_code).toBe('1000');
    expect(data.cdr_location.state).toBe('Brussels');
    expect(data.cdr_location.connector_standard).toBe('IEC_62196_T2_COMBO');
    expect(data.meter_id).toBe('METER-FULL-ABC123');
    expect(data.total_energy).toBeCloseTo(22.5);
    expect(data.total_time).toBeCloseTo(2.5);
    expect(data.total_parking_time).toBeCloseTo(0.75);
    expect(data.total_fixed_cost.excl_vat).toBeCloseTo(0.5);
    expect(data.total_energy_cost.excl_vat).toBeCloseTo(6.75);
    expect(data.total_parking_cost.excl_vat).toBeCloseTo(0.075);
    expect(data.remark).toBe('DC fast charge at Brussels Central');
    expect(data.invoice_reference_id).toBe(`INV-${id}`);

    expect(data.charging_periods).toHaveLength(2);
    expect(data.charging_periods[0].dimensions[0].type).toBe('ENERGY');
    expect(data.charging_periods[0].dimensions[1].type).toBe('MAX_CURRENT');
    expect(data.charging_periods[0].dimensions[1].volume).toBeCloseTo(63.0);
    expect(data.charging_periods[1].dimensions[0].type).toBe('PARKING_TIME');
  });

  it('posts a Credit CDR and exposes negative totals plus the reference id', async () => {
    const originalId = `CDR-ORIG-${RUN_ID}`;
    const creditId = `CDR-ORIG-${RUN_ID}-C`;
    const original = originalCdr(originalId);

    const postOriginal = await postCdr(original);
    expect(postOriginal.status).toBe(200);

    const postCredit = await postCdr(creditCdr(creditId, original));
    expect(postCredit.status).toBe(200);

    const get = await getCdr(locationOf(postCredit));
    expect(get.status).toBe(200);
    const data = get.data.data;

    expect(data.id).toBe(creditId);
    expect(data.credit).toBe(true);
    expect(data.credit_reference_id).toBe(originalId);
    expect(data.total_cost.excl_vat).toBeLessThan(0);
    expect(data.total_cost.excl_vat).toBeCloseTo(-2.0);
    expect(data.total_cost.incl_vat).toBeCloseTo(-2.2);
  });

  it('stores all charging periods for a multi-period CDR', async () => {
    const id = `CDR-MULTIPERIOD-${RUN_ID}`;
    const post = await postCdr(multiPeriodCdr(id));
    expect(post.status).toBe(200);

    const get = await getCdr(locationOf(post));
    const data = get.data.data;

    expect(data.charging_periods).toHaveLength(3);
    expect(data.charging_periods[0].dimensions[0].type).toBe('ENERGY');
    expect(data.charging_periods[0].dimensions[0].volume).toBeCloseTo(4.3);
    expect(data.charging_periods[0].dimensions[1].type).toBe('MAX_CURRENT');
    expect(data.charging_periods[0].dimensions[1].volume).toBeCloseTo(16.0);
    expect(data.charging_periods[1].dimensions[0].volume).toBeCloseTo(1.1);
    expect(data.charging_periods[2].dimensions[0].type).toBe('PARKING_TIME');
    expect(data.charging_periods[2].dimensions[0].volume).toBeCloseTo(1.5);

    expect(data.total_energy).toBeCloseTo(5.4);
    expect(data.total_parking_time).toBeCloseTo(1.5);
  });

  it('preserves signed_data (OCMF / Eichrecht) fields', async () => {
    const id = `CDR-SIGNED-${RUN_ID}`;
    const post = await postCdr(signedCdr(id));
    expect(post.status).toBe(200);

    const get = await getCdr(locationOf(post));
    const data = get.data.data;

    expect(data.signed_data.encoding_method).toBe('OCMF');
    expect(data.signed_data.encoding_method_version).toBe(1);
    expect(data.signed_data.public_key).toBeTruthy();
    expect(data.signed_data.url).toBe(`https://example.com/verify/${id}`);
    expect(data.signed_data.signed_values).toHaveLength(2);
    expect(data.signed_data.signed_values[0].nature).toBe('Start');
    expect(data.signed_data.signed_values[0].plain_data).toBeTruthy();
    expect(data.signed_data.signed_values[1].nature).toBe('End');
  });

  it('posts a home-charging-compensation CDR without a session_id', async () => {
    const id = `CDR-HOME-${RUN_ID}`;
    const post = await postCdr(homeChargingCdr(id));
    expect(post.status).toBe(200);

    const get = await getCdr(locationOf(post));
    const data = get.data.data;

    expect(data.home_charging_compensation).toBe(true);
    expect(data.cdr_token.type).toBe('APP_USER');
    expect(data.total_energy).toBeCloseTo(40.0);
    expect(data.total_time).toBeCloseTo(8.0);
    expect(data.session_id ?? null).toBeNull();
  });

  it('posts a reservation-only CDR with #NA sentinel connector fields', async () => {
    const id = `CDR-RESERVATION-${RUN_ID}`;
    const post = await postCdr(reservationCdr(id));
    expect(post.status).toBe(200);

    const get = await getCdr(locationOf(post));
    const data = get.data.data;

    expect(data.cdr_location.evse_uid).toBe('#NA');
    expect(data.cdr_location.evse_id).toBe('#NA');
    expect(data.cdr_location.connector_id).toBe('#NA');
    expect(data.session_id ?? null).toBeNull();
    expect(data.auth_method).toBe('COMMAND');
    expect(data.authorization_reference).toBe(`RESERVENOW-REF-${id}`);
    expect(data.total_reservation_cost.excl_vat).toBeCloseTo(1.0);
    expect(data.total_reservation_cost.incl_vat).toBeCloseTo(1.21);
    expect(data.total_energy).toBeCloseTo(0.0);
    expect(data.remark).toBe('Reservation expired without EV arriving');
    expect(data.charging_periods).toHaveLength(1);
    expect(data.charging_periods[0].dimensions[0].type).toBe(
      'RESERVATION_TIME',
    );
  });
});

describe('eMSP receiver — error paths', () => {
  it('rejects a duplicate CDR id with an OCPI error', async () => {
    const id = `CDR-DUP-${RUN_ID}`;
    const first = await postCdr(minimalCdr(id));
    expect(first.status).toBe(200);
    expect(first.data.status_code).toBe(1000);

    const dup = await postCdr(minimalCdr(id));
    expect(dup.data.status_code).not.toBe(1000);
  });

  it('rejects a CDR missing the required total_cost field', async () => {
    const id = `CDR-MISSING-${RUN_ID}`;
    const resp = await postCdr(missingTotalCostCdr(id));
    expect(resp.data.status_code).not.toBe(1000);
  });
});

describe('eMSP receiver — CDRs are immutable', () => {
  it('rejects PUT/PATCH/DELETE on the CDR endpoint', async () => {
    const id = `CDR-IMMUTABLE-${RUN_ID}`;
    const post = await postCdr(minimalCdr(id));
    const location = locationOf(post);

    const put = await http.put(location, minimalCdr(id), {
      headers: ocpiCpoHeaders(),
    });
    expect(put.status).toBe(405);

    const patch = await http.patch(
      location,
      { remark: 'attempt to patch' },
      { headers: ocpiCpoHeaders() },
    );
    expect(patch.status).toBe(405);

    const del = await http.delete(location, { headers: ocpiCpoHeaders() });
    expect(del.status).toBe(405);
  });
});
