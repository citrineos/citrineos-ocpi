// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

/**
 * eMSP receiver round trip against a real Hasura + real Postgres: a CPO PUTs a
 * Location, then GETs it back. Unlike locationEMSPMapping.test.ts (live stack on
 * :8085, no cleanup possible — hence its RUN_ID suffix), state here is TRUNCATEd
 * between tests, so ids are stable and reruns are deterministic.
 */

// Import the barrel first, the way the Server entrypoint does, so it evaluates
// top-to-bottom before helpers.ts re-enters it. Without this, entering the graph at
// a leaf service leaves SessionsClientApi's `extends BaseClientApi` undefined.
import { startOcpiTestStack } from '../../../../Tests/helpers/setupOcpiTestStack';
import type { OcpiTestStack } from '../../../../Tests/helpers/setupOcpiTestStack';
import { OcpiGraphqlClient } from '../../graphql/OcpiGraphqlClient';
import { LocationReceiverService } from '../LocationReceiverService';
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
} from 'vitest';

const LOCATION_ID = 'LOC-ROUNDTRIP-1';

const locationDto = {
  country_code: 'FR',
  party_id: 'CPO',
  id: LOCATION_ID,
  publish: true,
  name: 'Station Test',
  address: '1 rue de Test',
  city: 'Lyon',
  postal_code: '69000',
  country: 'FRA',
  coordinates: { latitude: '45.7640', longitude: '4.8357' },
  time_zone: 'Europe/Paris',
  evses: [],
  last_updated: '2026-01-01T10:00:00Z',
} as any;

describe('LocationReceiverService — real Hasura round trip', () => {
  let stack: OcpiTestStack;
  let service: LocationReceiverService;
  let tenantPartner: any;

  beforeAll(async () => {
    stack = await startOcpiTestStack();
    const client = new OcpiGraphqlClient(
      stack.graphqlEndpoint,
      stack.graphqlHeaders,
    );
    const logger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    service = new LocationReceiverService(logger as any, client);
  });

  afterAll(async () => {
    await stack?.stop();
  });

  beforeEach(async () => {
    await stack.cleanup([
      'Connectors',
      'Evses',
      'ChargingStations',
      'Locations',
      'TenantPartners',
      'Tenants',
    ]);

    // Same identity the seeded FR/CPO direct partner carries — see
    // seeders/20250806120002-default-tenant-partner.ts for the required columns.
    const [tenant] = await stack.sequelize.query(
      `INSERT INTO "Tenants" (name, "isUserTenant", "createdAt", "updatedAt")
       VALUES ('test-tenant', false, now(), now()) RETURNING id`,
      { type: 'SELECT' as any },
    );
    const tenantId = (tenant as any).id;

    const [partner] = await stack.sequelize.query(
      `INSERT INTO "TenantPartners" ("tenantId", "countryCode", "partyId", "createdAt", "updatedAt")
       VALUES (${tenantId}, 'FR', 'CPO', now(), now()) RETURNING id`,
      { type: 'SELECT' as any },
    );

    tenantPartner = {
      id: (partner as any).id,
      tenantId,
      countryCode: 'FR',
      partyId: 'CPO',
      roamingPartners: [],
    };
  });

  it('persists the location to Postgres on PUT', async () => {
    await service.putLocationByCountryPartyAndId(
      'FR',
      'CPO',
      locationDto,
      LOCATION_ID,
      tenantPartner,
    );

    // Read back through SQL, bypassing Hasura: proves the row really landed, and
    // that the columns Hasura wrote are the ones you think they are.
    const rows: any[] = await stack.sequelize.query(
      `SELECT * FROM "Locations" WHERE "ocpiId" = '${LOCATION_ID}'`,
      { type: 'SELECT' as any },
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      ocpiId: LOCATION_ID,
      ownerTenantPartnerId: tenantPartner.id,
      tenantId: tenantPartner.tenantId,
      city: 'Lyon',
      postalCode: '69000',
      timeZone: 'Europe/Paris',
      publishUpstream: true,
    });
  });

  it('returns that same location on a subsequent GET', async () => {
    await service.putLocationByCountryPartyAndId(
      'FR',
      'CPO',
      locationDto,
      LOCATION_ID,
      tenantPartner,
    );

    const response = await service.getLocationByCountryPartyAndId(
      'FR',
      'CPO',
      LOCATION_ID,
      tenantPartner,
    );

    expect(response.status_code).toBe(1000);
    expect(response.data).toMatchObject({
      id: LOCATION_ID,
      country_code: 'FR',
      party_id: 'CPO',
      city: 'Lyon',
      postal_code: '69000',
    });
  });

  it('is idempotent: a second PUT replaces rather than duplicating', async () => {
    await service.putLocationByCountryPartyAndId(
      'FR',
      'CPO',
      locationDto,
      LOCATION_ID,
      tenantPartner,
    );
    await service.putLocationByCountryPartyAndId(
      'FR',
      'CPO',
      { ...locationDto, city: 'Villeurbanne' },
      LOCATION_ID,
      tenantPartner,
    );

    const rows: any[] = await stack.sequelize.query(
      `SELECT city FROM "Locations" WHERE "ocpiId" = '${LOCATION_ID}'`,
      { type: 'SELECT' as any },
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].city).toBe('Villeurbanne');
  });

  it('does not leak a location across partners', async () => {
    await service.putLocationByCountryPartyAndId(
      'FR',
      'CPO',
      locationDto,
      LOCATION_ID,
      tenantPartner,
    );

    const other = { ...tenantPartner, id: tenantPartner.id + 1000 };
    const response = await service.getLocationByCountryPartyAndId(
      'FR',
      'CPO',
      LOCATION_ID,
      other,
    );

    // 2003 ClientUnknownLocation at HTTP 200 — per locationEMSPMapping.test.ts's header.
    expect(response.status_code).toBe(2003);
  });
});
