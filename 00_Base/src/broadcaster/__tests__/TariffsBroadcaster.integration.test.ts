// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

/**
 * CPO push chain, half 2, for Tariffs — same shape as TokenBroadcaster.integration.test.ts.
 *
 * Complements TariffsBroadcaster.test.ts rather than replacing it: that file mocks
 * ocpiGraphqlClient, util/helpers and mapper/index to pin the branch logic. Here all three
 * are REAL, so this covers what mocking cannot — GET_TARIFF_FOR_BROADCAST_QUERY against a
 * real schema, TariffMapper.mapForSender's actual OCPI body, the jsonb partner filter, and
 * the wire format (URL, Authorization, routing headers).
 *
 * Roles are inverted relative to Tokens: for Tariffs the CPO is Sender (spec 11.2), so WE
 * are the CPO and the partner is the eMSP. shouldBroadcastToPartner requires EMSP for every
 * module except Tokens.
 *
 * SEAM: production reaches this broadcaster via pg NOTIFY -> DtoRouter -> RabbitMQ ->
 * @AsDtoEventHandler. That hop is not covered; TariffNotify.integration.test.ts covers the
 * DB->NOTIFY half.
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
import { TariffsBroadcaster } from '../TariffsBroadcaster';

const PARTNER_ORIGIN = 'http://partner.test';
const PARTNER_TARIFFS_URL = `${PARTNER_ORIGIN}/ocpi/emsp/2.2.1/tariffs`;
const PARTNER_TOKEN = 'partner-credentials-token';
const OCPI_TARIFF_ID = 'TARIFF-1';

describe('TariffsBroadcaster — outbound OCPI request', () => {
  let stack: OcpiTestStack;
  let broadcaster: TariffsBroadcaster;
  let tenant: any;
  let dbTariffId: number;

  beforeAll(async () => {
    stack = await startOcpiTestStack();

    // Mirrors OcpiServer.initContainer(): shouldBroadcastToPartner does
    // Container.get(OcpiConfigToken), and without it the broadcast is skipped with only a
    // log line.
    Container.set(OcpiConfigToken, {
      database: {
        host: 'unused',
        port: 5432,
        username: 'u',
        password: 'p',
        database: 'd',
      },
    } as any);
    Container.set(Logger, new Logger({ minLevel: 6 }));
    Container.set(
      OcpiGraphqlClient,
      new OcpiGraphqlClient(stack.graphqlEndpoint, stack.graphqlHeaders),
    );
    broadcaster = Container.get(TariffsBroadcaster);
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
    await stack.cleanup([
      'TariffElements',
      'Tariffs',
      'TenantPartners',
      'Tenants',
    ]);

    const [t]: any[] = await stack.sequelize.query(
      `INSERT INTO "Tenants" (name, "isUserTenant", "countryCode", "partyId", "createdAt", "updatedAt")
       VALUES ('cpo-tenant', false, 'FR', 'CPO', now(), now())
       RETURNING id, "countryCode", "partyId"`,
      { type: 'SELECT' as any },
    );
    tenant = t;

    const profile = {
      // getHeaders() builds `Authorization: Token <base64>` from this and throws without it.
      credentials: { token: PARTNER_TOKEN },
      // EMSP, not CPO — see the header note about role inversion.
      roles: [{ role: 'EMSP', country_code: 'FR', party_id: 'EMS' }],
      endpoints: [
        {
          identifier: 'tariffs_RECEIVER',
          role: 'RECEIVER',
          url: PARTNER_TARIFFS_URL,
        },
      ],
    };

    await stack.sequelize.query(
      `INSERT INTO "TenantPartners"
         ("tenantId", "countryCode", "partyId", "partnerProfileOCPI", "createdAt", "updatedAt")
       VALUES (${tenant.id}, 'FR', 'EMS', '${JSON.stringify(profile)}'::jsonb, now(), now())`,
    );

    // tenantPartnerId stays NULL: that is what marks the tariff as OURS (partner-owned
    // tariffs are never re-broadcast), and the check constraint
    // Tariffs_own_tariff_requires_start_date then requires startDateTime.
    const [tariff]: any[] = await stack.sequelize.query(
      `INSERT INTO "Tariffs"
         (currency, "ocpiTariffId", "tenantId", "startDateTime", "createdAt", "updatedAt")
       VALUES ('EUR', '${OCPI_TARIFF_ID}', ${tenant.id}, now(), now(), now())
       RETURNING id`,
      { type: 'SELECT' as any },
    );
    dbTariffId = tariff.id;

    // OCPI requires `elements` on a Tariff (spec 11.3.1); without one, mapForSender's
    // output is incomplete and the assertion below is what catches it.
    await stack.sequelize.query(
      `INSERT INTO "TariffElements" ("tariffId", "priceComponents", "createdAt", "updatedAt")
       VALUES (${dbTariffId}, '[{"type":"ENERGY","price":0.42,"step_size":1}]'::jsonb, now(), now())`,
    );
  });

  it('PUTs the mapped tariff, translating the DB id to the OCPI id in the path', async () => {
    let seen: { path: string; body: any; headers: any } | undefined;

    const scope = nock(PARTNER_ORIGIN)
      .put(/\/ocpi\/emsp\/2\.2\.1\/tariffs\/FR\/CPO\/.+/)
      .reply(200, function (uri, body) {
        seen = { path: uri, body, headers: this.req.headers };
        return { status_code: 1000, timestamp: '2026-01-01T10:00:01Z' };
      });

    // The caller passes the DB row id; the path must carry the OCPI id, because that is
    // the identifier the partner knows the object by.
    await broadcaster.broadcastPutTariff(tenant, { id: dbTariffId } as any);

    expect(scope.isDone()).toBe(true);
    expect(seen!.path).toContain(`/tariffs/FR/CPO/${OCPI_TARIFF_ID}`);

    // Real TariffMapper.mapForSender over a real Hasura row — the mocked unit test cannot
    // reach either.
    expect(seen!.body).toMatchObject({ id: OCPI_TARIFF_ID, currency: 'EUR' });
    expect(Array.isArray(seen!.body.elements)).toBe(true);
    expect(seen!.body.elements.length).toBeGreaterThan(0);

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

  it('does not broadcast to a partner whose roles lack EMSP', async () => {
    await stack.sequelize.query(
      `UPDATE "TenantPartners" SET "partnerProfileOCPI" = jsonb_set(
         "partnerProfileOCPI", '{roles}', '[{"role":"CPO"}]'::jsonb)`,
    );

    const scope = nock(PARTNER_ORIGIN).put(/.*/).reply(200, {});

    await broadcaster.broadcastPutTariff(tenant, { id: dbTariffId } as any);

    expect(scope.isDone()).toBe(false);
  });

  // OCPI Tariffs has a real DELETE on the receiver interface (spec 11.2.2) — unlike Tokens,
  // where removal is a PATCH with valid:false.
  it('DELETEs at the tariff path with no body', async () => {
    let seenBody: any = 'unset';

    const scope = nock(PARTNER_ORIGIN)
      .delete(/\/ocpi\/emsp\/2\.2\.1\/tariffs\/FR\/CPO\/.+/)
      .reply(200, function (_uri, body) {
        seenBody = body;
        return { status_code: 1000, timestamp: '2026-01-01T10:00:01Z' };
      });

    // Mirrors what handleTariffDelete actually forwards: a row carrying ocpiTariffId,
    // which broadcastTariffDeletion prefers over recomputing the id from `tenant`.
    await broadcaster.broadcastTariffDeletion(tenant, {
      id: OCPI_TARIFF_ID,
      ocpiTariffId: OCPI_TARIFF_ID,
    } as any);

    expect(scope.isDone()).toBe(true);
    expect(seenBody).toBeFalsy();
  });

  it('DELETEs using the OCPI id, not the internal DB id', async () => {
    let seenPath: string | undefined;
    const scope = nock(PARTNER_ORIGIN)
      .delete(/\/tariffs\/FR\/CPO\/.+/)
      .reply(200, function (uri) {
        seenPath = uri;
        return { status_code: 1000, timestamp: '2026-01-01T10:00:01Z' };
      });

    // Exactly what handleTariffDelete forwards: the trigger's to_jsonb(OLD) plus the
    // merged tenant. `id` is the DB primary key.
    await broadcaster.broadcastTariffDeletion(tenant, {
      id: dbTariffId,
      ocpiTariffId: OCPI_TARIFF_ID,
      tenant: { countryCode: 'FR', partyId: 'CPO' },
    } as any);

    expect(scope.isDone()).toBe(true);
    expect(seenPath).toContain(`/tariffs/FR/CPO/${OCPI_TARIFF_ID}`);
    expect(seenPath).not.toContain(`/tariffs/FR/CPO/${dbTariffId}`);
  });
});
