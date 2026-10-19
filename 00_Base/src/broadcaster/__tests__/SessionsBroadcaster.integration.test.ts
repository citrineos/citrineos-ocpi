// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

/**
 * CPO push chain, half 2, for Sessions — same shape as TariffsBroadcaster.integration.test.ts /
 * TokenBroadcaster.integration.test.ts. Given a tenant, a partner row and a (hand-built)
 * TransactionDto, SessionBroadcaster must map it to an OCPI Session and issue the correct
 * outbound OCPI request(s). The partner lookup goes through REAL Hasura
 * (LIST_TENANT_PARTNERS_BY_CPO), same as every other broadcaster test.
 *
 * Unlike TariffsBroadcaster, SessionBroadcaster does NOT do its own GraphQL re-fetch — the
 * mapping (SessionMapper.mapTransactionToSession) only queries Hasura for location/token/tariff
 * when those fields are *missing* from the TransactionDto. This test supplies them inline
 * (mirroring how 03_Modules/Sessions/src/index.ts hands the broadcaster an already-hydrated
 * TransactionDto from GET_TRANSACTION_BY_TRANSACTION_ID_QUERY), so no Location/ChargingStation/
 * Evse/Connector/Tariff/Authorization rows need to be seeded in Postgres — same style as
 * TokenBroadcaster.integration.test.ts, which passes a ready-made AuthorizationDto directly.
 *
 * SEAM: production reaches this broadcaster via pg NOTIFY -> DtoRouter -> RabbitMQ ->
 * @AsDtoEventHandler. That hop is not covered; SessionsNotify.integration.test.ts covers the
 * DB->NOTIFY half (the "TransactionNotification" trigger).
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
import { SessionBroadcaster } from '../SessionBroadcaster';

const PARTNER_ORIGIN = 'http://partner.test';
const PARTNER_SESSIONS_URL = `${PARTNER_ORIGIN}/ocpi/emsp/2.2.1/sessions`;
const PARTNER_TOKEN = 'partner-credentials-token';

describe('SessionBroadcaster — outbound OCPI request', () => {
  let stack: OcpiTestStack;
  let broadcaster: SessionBroadcaster;
  let tenant: any;
  let partnerId: number;

  beforeAll(async () => {
    stack = await startOcpiTestStack();

    // Mirrors OcpiServer.initContainer(): shouldBroadcastToPartner and isGirevePartner both
    // do Container.get(OcpiConfigToken), so the config must be registered or the broadcast is
    // skipped/misclassified. "gireve" is set to an identity distinct from our seeded partner so
    // isGirevePartner(ourPartner) is unambiguously false.
    Container.set(OcpiConfigToken, {
      database: {
        host: 'unused',
        port: 5432,
        username: 'u',
        password: 'p',
        database: 'd',
      },
      gireve: { countryCode: 'FR', partyId: 'GRV' },
    } as any);
    Container.set(Logger, new Logger({ minLevel: 6 }));
    Container.set(
      OcpiGraphqlClient,
      new OcpiGraphqlClient(stack.graphqlEndpoint, stack.graphqlHeaders),
    );
    broadcaster = Container.get(SessionBroadcaster);
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

    // Sessions are owned by the CPO (spec 9), so the CPO is Sender and the receiving partner
    // is an eMSP.
    const [t]: any[] = await stack.sequelize.query(
      `INSERT INTO "Tenants" (name, "isUserTenant", "countryCode", "partyId", "createdAt", "updatedAt")
       VALUES ('cpo-tenant', false, 'FR', 'CPO', now(), now())
       RETURNING id, "countryCode", "partyId"`,
      { type: 'SELECT' as any },
    );
    tenant = t;

    const profile = {
      credentials: { token: PARTNER_TOKEN },
      roles: [{ role: 'EMSP', country_code: 'FR', party_id: 'EMS' }],
      endpoints: [
        {
          identifier: 'sessions_RECEIVER',
          role: 'RECEIVER',
          url: PARTNER_SESSIONS_URL,
        },
      ],
    };

    const [p]: any[] = await stack.sequelize.query(
      `INSERT INTO "TenantPartners"
         ("tenantId", "countryCode", "partyId", "partnerProfileOCPI", "createdAt", "updatedAt")
       VALUES (${tenant.id}, 'FR', 'EMS', '${JSON.stringify(profile)}'::jsonb, now(), now())
       RETURNING id`,
      { type: 'SELECT' as any },
    );
    partnerId = p.id;
  });

  // Everything SessionMapper.mapTransactionToSession needs, supplied inline so the mapper's
  // own internal GraphQL lookups (location/token/tariff) are all skipped (their guard is
  // `if (!transaction.X && transaction.XId)`).
  function buildTransactionDto(overrides: Record<string, any> = {}) {
    return {
      id: 501,
      transactionId: 'TX-1',
      stationId: 'ST-1',
      evseId: 1,
      connectorId: 1,
      locationId: 10,
      tariffId: 20,
      authorizationId: 30,
      isActive: true,
      chargingState: 'Charging',
      totalKwh: 5.5,
      startTime: '2026-01-01T10:00:00Z',
      endTime: undefined,
      createdAt: '2026-01-01T09:59:00Z',
      updatedAt: '2026-01-01T10:05:00Z',
      meterValues: [],
      tenant: { countryCode: 'FR', partyId: 'CPO' },
      location: {
        id: 10,
        tenant: { countryCode: 'FR', partyId: 'CPO' },
        publishUpstream: true,
        name: 'Test Location',
        address: '1 Test St',
        city: 'Paris',
        postalCode: '75001',
        country: 'FRA',
        coordinates: { coordinates: [2.35, 48.86] },
        timeZone: 'Europe/Paris',
        updatedAt: '2026-01-01T09:00:00Z',
        chargingPool: [
          {
            id: 'ST-1',
            capabilities: [],
            evses: [
              {
                id: 1,
                evseTypeId: 3,
                evseId: 'FR*CPO*E0001',
                physicalReference: null,
                updatedAt: '2026-01-01T09:00:00Z',
                connectors: [],
              },
            ],
          },
        ],
      },
      authorization: {
        id: 30,
        idToken: 'DEADBEEF',
        idTokenType: 'ISO14443',
        status: 'Accepted',
        updatedAt: '2026-01-01T10:00:00Z',
        additionalInfo: [
          { type: 'eMAID', additionalIdToken: 'FRELCC12345' },
          { type: 'visual_number', additionalIdToken: 'DF000-2001-8999' },
          { type: 'issuer', additionalIdToken: 'Enexflow' },
        ],
        tenants: [{ tenant: { countryCode: 'FR', partyId: 'EMS' } }],
        tenantPartner: {
          id: partnerId,
          countryCode: 'FR',
          partyId: 'EMS',
        },
      },
      tariff: {
        id: 20,
        currency: 'EUR',
        ocpiTariffId: 'TARIFF-1',
        taxRate: 10,
        TariffElements: [
          { priceComponents: [{ type: 'ENERGY', price: 0.42, vat: 10 }] },
        ],
      },
      ...overrides,
    } as any;
  }

  it('PUTs the mapped session, translating the DB id to the OCPI (transaction) id in the path', async () => {
    let seen: { path: string; body: any; headers: any } | undefined;

    const scope = nock(PARTNER_ORIGIN)
      .put(/\/ocpi\/emsp\/2\.2\.1\/sessions\/FR\/CPO\/.+/)
      .reply(200, function (uri, body) {
        seen = { path: uri, body, headers: this.req.headers };
        return { status_code: 1000, timestamp: '2026-01-01T10:00:01Z' };
      });

    const transactionDto = buildTransactionDto();
    broadcaster.clearSessionBroadcastDedupe(transactionDto.transactionId);

    await broadcaster.broadcastPutSession(tenant, transactionDto, partnerId);

    expect(scope.isDone()).toBe(true);
    expect(seen!.path).toContain('/sessions/FR/CPO/TX-1');

    // Real SessionMapper.mapTransactionToSession over hand-built context objects.
    expect(seen!.body).toMatchObject({
      id: 'TX-1',
      currency: 'EUR',
      kwh: 5.5,
      status: 'ACTIVE',
      cdr_token: expect.objectContaining({
        contract_id: 'FRELCC12345',
        country_code: 'FR',
        party_id: 'EMS',
      }),
    });

    // Credentials token MUST be Base64-encoded (spec 4.1.2); the four routing headers are
    // mandatory on functional modules (spec 4.1.8.2).
    expect(seen!.headers).toMatchObject({
      authorization: `Token ${Buffer.from(PARTNER_TOKEN).toString('base64')}`,
      'ocpi-from-country-code': 'FR',
      'ocpi-from-party-id': 'CPO',
      'ocpi-to-country-code': 'FR',
      'ocpi-to-party-id': 'EMS',
    });
  });

  it('does not broadcast when no token owner partner is given', async () => {
    const scope = nock(PARTNER_ORIGIN).put(/.*/).reply(200, {});

    const transactionDto = buildTransactionDto();
    broadcaster.clearSessionBroadcastDedupe(transactionDto.transactionId);

    await broadcaster.broadcastPutSession(tenant, transactionDto, undefined);

    expect(scope.isDone()).toBe(false);
  });

  it('does not broadcast to a partner whose roles lack EMSP', async () => {
    await stack.sequelize.query(
      `UPDATE "TenantPartners" SET "partnerProfileOCPI" = jsonb_set(
         "partnerProfileOCPI", '{roles}', '[{"role":"CPO"}]'::jsonb)`,
    );

    const scope = nock(PARTNER_ORIGIN).put(/.*/).reply(200, {});

    const transactionDto = buildTransactionDto();
    broadcaster.clearSessionBroadcastDedupe(transactionDto.transactionId);

    await broadcaster.broadcastPutSession(tenant, transactionDto, partnerId);

    expect(scope.isDone()).toBe(false);
  });

  it('PATCH sends the incremental patch to the partner and does not PUT it (partner is not Gireve)', async () => {
    let seenPatchBody: any;
    const patchScope = nock(PARTNER_ORIGIN)
      .patch(/\/sessions\/FR\/CPO\/TX-1/)
      .reply(200, function (_uri, body) {
        seenPatchBody = body;
        return { status_code: 1000, timestamp: '2026-01-01T10:00:01Z' };
      });
    const putScope = nock(PARTNER_ORIGIN)
      .put(/\/sessions\/FR\/CPO\/TX-1/)
      .reply(200, {});

    const transactionDto = buildTransactionDto({
      totalKwh: 8.2,
      updatedAt: '2026-01-01T10:10:00Z',
    });
    broadcaster.clearSessionBroadcastDedupe(transactionDto.transactionId);

    await broadcaster.broadcastPatchSession(tenant, transactionDto, partnerId);

    expect(patchScope.isDone()).toBe(true);
    expect(seenPatchBody).toMatchObject({ id: 'TX-1', kwh: 8.2 });
    // broadcastPatchSession's PUT branch is filtered to Gireve partners only (see
    // broadcastPatchConnectorTariffsGireve-equivalent split); our seeded partner isn't Gireve.
    expect(putScope.isDone()).toBe(false);
  });

  it('broadcasts a charging-period PATCH containing a TIME dimension for the given tariff', async () => {
    let seenBody: any;
    const scope = nock(PARTNER_ORIGIN)
      .patch(/\/sessions\/FR\/CPO\/TX-1/)
      .reply(200, function (_uri, body) {
        seenBody = body;
        return { status_code: 1000, timestamp: '2026-01-01T10:00:01Z' };
      });

    const meterValueDto = {
      transactionId: 'TX-1',
      tariffId: 20,
      timestamp: '2026-01-01T10:15:00Z',
      sampledValue: [],
    } as any;

    await broadcaster.broadcastPatchSessionChargingPeriod(
      tenant,
      meterValueDto,
      partnerId,
    );

    expect(scope.isDone()).toBe(true);
    expect(seenBody.charging_periods).toHaveLength(1);
    expect(seenBody.charging_periods[0]).toMatchObject({ tariff_id: '20' });
    expect(seenBody.charging_periods[0].dimensions).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'TIME' })]),
    );
  });
});
