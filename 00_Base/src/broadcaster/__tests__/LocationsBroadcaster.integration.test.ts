// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

/**
 * CPO push chain, half 2, for Locations — same shape as TariffsBroadcaster.integration.test.ts /
 * TokenBroadcaster.integration.test.ts.
 *
 * Per 03_Modules/Locations/src/index.ts (see LocationsBroadcaster.test.ts's header comment),
 * only THREE LocationsBroadcaster methods are actually reachable in production today — every
 * other call site is commented out:
 *   - broadcastPatchEvseStatus         (OCPI: PATCH .../locations/{cc}/{pid}/{locId}/{evseUid})
 *   - broadcastPatchConnectorTariffs        (OCPI-spec connector-level tariff_ids PATCH)
 *   - broadcastPatchConnectorTariffsGireve  (Gireve-specific EVSE-level PATCH: Gireve's
 *     "PUSH EVSE Status - ToIOP / PATCH ToIOP_receiver_locations-evse" flow requires the EVSE's
 *     status AND the connector's new tariff ID in the same request, per the Gireve OCPI 2.2.1
 *     implementation guide §3.5.3/§3.10 — see GireveImplementationGuide in docs.)
 * This test covers exactly those three, mirroring how the Locations module's own DTO event
 * handlers call them (03_Modules/Locations/src/index.ts:325-361, :437-458).
 *
 * Like SessionBroadcaster (and unlike TariffsBroadcaster), LocationsBroadcaster does no GraphQL
 * fetching of its own — it takes already-hydrated DTOs and maps+broadcasts them. So, as with
 * TokenBroadcaster.integration.test.ts, only Tenants/TenantPartners need seeding; the partner
 * lookup (LIST_TENANT_PARTNERS_BY_CPO) is the one real Hasura call every broadcaster makes.
 *
 * SEAM: production reaches this broadcaster via pg NOTIFY -> DtoRouter -> RabbitMQ ->
 * @AsDtoEventHandler. That hop is not covered; LocationsNotify.integration.test.ts covers the
 * DB->NOTIFY half (ConnectorNotification's isStatusChanged flag and ConnectorTariffNotification).
 */
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from 'vitest';
import nock from 'nock';
// nock auto-activates (patches http.ClientRequest) on import, and fileParallelism:false
// means every integration file shares one process — so without this, nock's patch is
// already live during this file's OWN startOcpiTestStack() container startup below,
// racing dockerode's Docker-daemon HTTP traffic. Stay inactive until beforeAll re-enables
// it, once containers are up.
nock.restore();
import { Container } from 'typedi';
import { Logger } from 'tslog';
import { startOcpiTestStack } from '../../../../Tests/helpers/setupOcpiTestStack';
import type { OcpiTestStack } from '../../../../Tests/helpers/setupOcpiTestStack';
import { OcpiGraphqlClient } from '../../graphql/OcpiGraphqlClient';
import { OcpiConfigToken } from '../../config/ocpi.types';
import { LocationsBroadcaster } from '../LocationsBroadcaster';

const PARTNER_ORIGIN = 'http://partner.test';
const PARTNER_LOCATIONS_URL = `${PARTNER_ORIGIN}/ocpi/emsp/2.2.1/locations`;
const GIREVE_ORIGIN = 'http://gireve.test';
const GIREVE_LOCATIONS_URL = `${GIREVE_ORIGIN}/ocpi/emsp/2.2.1/locations`;
const PARTNER_TOKEN = 'partner-credentials-token';
const GIREVE_TOKEN = 'gireve-credentials-token';

describe('LocationsBroadcaster — outbound OCPI request', () => {
  let stack: OcpiTestStack;
  let broadcaster: LocationsBroadcaster;
  let tenant: any;

  beforeAll(async () => {
    stack = await startOcpiTestStack();

    Container.set(OcpiConfigToken, {
      database: {
        host: 'unused',
        port: 5432,
        username: 'u',
        password: 'p',
        database: 'd',
      },
      // A distinct Gireve identity so a normal partner (FR/EMS) is never misclassified as
      // Gireve, and a partner actually registered as FR/GRV below is unambiguously Gireve.
      gireve: { countryCode: 'FR', partyId: 'GRV' },
    } as any);
    Container.set(Logger, new Logger({ minLevel: 6 }));
    Container.set(
      OcpiGraphqlClient,
      new OcpiGraphqlClient(stack.graphqlEndpoint, stack.graphqlHeaders),
    );
    broadcaster = Container.get(LocationsBroadcaster);
    if (!nock.isActive()) nock.activate();
  });

  afterAll(async () => {
    nock.restore();
    Container.reset();
    await stack?.stop();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  beforeEach(async () => {
    await stack.cleanup(['TenantPartners', 'Tenants']);

    // Locations are owned by the CPO (spec 8), so the CPO is Sender and the receiving
    // partners are eMSPs.
    const [t]: any[] = await stack.sequelize.query(
      `INSERT INTO "Tenants" (name, "isUserTenant", "countryCode", "partyId", "createdAt", "updatedAt")
       VALUES ('cpo-tenant', false, 'FR', 'CPO', now(), now())
       RETURNING id, "countryCode", "partyId"`,
      { type: 'SELECT' as any },
    );
    tenant = t;

    const normalProfile = {
      credentials: { token: PARTNER_TOKEN },
      roles: [{ role: 'EMSP', country_code: 'FR', party_id: 'EMS' }],
      endpoints: [
        {
          identifier: 'locations_RECEIVER',
          role: 'RECEIVER',
          url: PARTNER_LOCATIONS_URL,
        },
      ],
    };
    await stack.sequelize.query(
      `INSERT INTO "TenantPartners"
         ("tenantId", "countryCode", "partyId", "partnerProfileOCPI", "createdAt", "updatedAt")
       VALUES (${tenant.id}, 'FR', 'EMS', '${JSON.stringify(normalProfile)}'::jsonb, now(), now())`,
    );

    // A second partner whose country_code/party_id match the configured Gireve identity
    // (FR/GRV), so isGirevePartner(...) is true for it and false for the FR/EMS partner above.
    const gireveProfile = {
      credentials: { token: GIREVE_TOKEN },
      roles: [{ role: 'EMSP', country_code: 'FR', party_id: 'GRV' }],
      endpoints: [
        {
          identifier: 'locations_RECEIVER',
          role: 'RECEIVER',
          url: GIREVE_LOCATIONS_URL,
        },
      ],
    };
    await stack.sequelize.query(
      `INSERT INTO "TenantPartners"
         ("tenantId", "countryCode", "partyId", "partnerProfileOCPI", "createdAt", "updatedAt")
       VALUES (${tenant.id}, 'FR', 'GRV', '${JSON.stringify(gireveProfile)}'::jsonb, now(), now())`,
    );
  });

  function connectorDto(id: number, overrides: Record<string, any> = {}) {
    return {
      id,
      type: 'IEC_62196_T2',
      format: 'Socket',
      powerType: 'AC3Phase',
      status: 'Available',
      maximumVoltage: 400,
      maximumAmperage: 32,
      updatedAt: new Date('2026-01-01T09:00:00Z'),
      ocpiId: null,
      ...overrides,
    } as any;
  }

  it('PATCHes the EVSE status (Gireve "PUSH EVSE Status" flow) to all registered partners', async () => {
    let seenNormal: { path: string; body: any } | undefined;
    let seenGireve: { path: string; body: any } | undefined;

    const normalScope = nock(PARTNER_ORIGIN)
      .patch(/\/ocpi\/emsp\/2\.2\.1\/locations\/FR\/CPO\/LOC1\/ST-1::3/)
      .reply(200, function (uri, body) {
        seenNormal = { path: uri, body };
        return { status_code: 1000, timestamp: '2026-01-01T10:00:01Z' };
      });
    const gireveScope = nock(GIREVE_ORIGIN)
      .patch(/\/ocpi\/emsp\/2\.2\.1\/locations\/FR\/CPO\/LOC1\/ST-1::3/)
      .reply(200, function (uri, body) {
        seenGireve = { path: uri, body };
        return { status_code: 1000, timestamp: '2026-01-01T10:00:01Z' };
      });

    const evseDto = { stationId: 'ST-1', evseTypeId: 3, id: 1 } as any;
    const chargingStationDto = { locationId: 'LOC1' } as any;
    const lastUpdated = new Date('2026-01-01T10:05:00Z');

    await broadcaster.broadcastPatchEvseStatus(
      tenant,
      evseDto,
      lastUpdated,
      chargingStationDto,
      'AVAILABLE' as any,
    );

    // broadcastPatchEvseStatus sets no partnerFilter — it must reach BOTH partners.
    expect(normalScope.isDone()).toBe(true);
    expect(gireveScope.isDone()).toBe(true);
    expect(seenNormal!.body).toMatchObject({ status: 'AVAILABLE' });
    expect(seenGireve!.body).toMatchObject({ status: 'AVAILABLE' });
  });

  it('does not broadcast EVSE status to a partner whose roles lack EMSP', async () => {
    await stack.sequelize.query(
      `UPDATE "TenantPartners" SET "partnerProfileOCPI" = jsonb_set(
         "partnerProfileOCPI", '{roles}', '[{"role":"CPO"}]'::jsonb)`,
    );

    const scope = nock(PARTNER_ORIGIN).patch(/.*/).reply(200, {});
    const gireveScope = nock(GIREVE_ORIGIN).patch(/.*/).reply(200, {});

    const evseDto = { stationId: 'ST-1', evseTypeId: 3, id: 1 } as any;
    const chargingStationDto = { locationId: 'LOC1' } as any;

    await broadcaster.broadcastPatchEvseStatus(
      tenant,
      evseDto,
      new Date(),
      chargingStationDto,
      'AVAILABLE' as any,
    );

    expect(scope.isDone()).toBe(false);
    expect(gireveScope.isDone()).toBe(false);
  });

  it('PATCHes the OCPI-spec connector tariff_ids only to the non-Gireve partner', async () => {
    let seenBody: any;
    const normalScope = nock(PARTNER_ORIGIN)
      .patch(/\/locations\/FR\/CPO\/LOC1\/ST-1::3\/9/)
      .reply(200, function (_uri, body) {
        seenBody = body;
        return { status_code: 1000, timestamp: '2026-01-01T10:00:01Z' };
      });
    const gireveScope = nock(GIREVE_ORIGIN).patch(/.*/).reply(200, {});

    await broadcaster.broadcastPatchConnectorTariffs(
      tenant,
      'LOC1',
      'ST-1',
      3,
      9,
      ['TARIFF-1', 'TARIFF-2'],
      new Date('2026-01-01T10:10:00Z'),
    );

    expect(normalScope.isDone()).toBe(true);
    expect(seenBody).toMatchObject({ tariff_ids: ['TARIFF-1', 'TARIFF-2'] });
    // The Gireve-specific format is sent by broadcastPatchConnectorTariffsGireve instead —
    // the OCPI-spec connector PATCH must never reach the Gireve partner.
    expect(gireveScope.isDone()).toBe(false);
  });

  it('PATCHes the Gireve EVSE-level payload (status + full connector list) only to the Gireve partner', async () => {
    let seenBody: any;
    const gireveScope = nock(GIREVE_ORIGIN)
      .patch(/\/locations\/FR\/CPO\/LOC1\/ST-1::3$/)
      .reply(200, function (_uri, body) {
        seenBody = body;
        return { status_code: 1000, timestamp: '2026-01-01T10:00:01Z' };
      });
    const normalScope = nock(PARTNER_ORIGIN).patch(/.*/).reply(200, {});

    const evseConnectors = [connectorDto(9), connectorDto(10)];

    await broadcaster.broadcastPatchConnectorTariffsGireve(
      tenant,
      'LOC1',
      'ST-1',
      3,
      evseConnectors,
      9,
      ['TARIFF-1'],
      new Date('2026-01-01T10:10:00Z'),
    );

    expect(gireveScope.isDone()).toBe(true);
    expect(seenBody.connectors).toHaveLength(2);
    const changed = seenBody.connectors.find((c: any) => c.id === '9');
    const unchanged = seenBody.connectors.find((c: any) => c.id === '10');
    expect(changed).toMatchObject({ tariff_ids: ['TARIFF-1'] });
    expect(unchanged.tariff_ids).toBeUndefined();
    // The OCPI-spec connector PATCH is sent separately by broadcastPatchConnectorTariffs — the
    // Gireve full-EVSE format must never reach the non-Gireve partner.
    expect(normalScope.isDone()).toBe(false);
  });
});
