// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

/**
 * Half 2 of the CPO push chain: given a tenant and a partner row, TokenBroadcaster must
 * issue the correct outbound OCPI request. The partner lookup goes through REAL Hasura
 * (LIST_TENANT_PARTNERS_BY_CPO), so this also validates that query and the
 * partnerProfileOCPI JSON shape it filters on — which a mocked test cannot.
 *
 * SEAM: the production path reaches this broadcaster via pg NOTIFY -> DtoRouter -> RabbitMQ
 * -> RabbitMqDtoReceiver -> @AsDtoEventHandler. That broker hop is NOT covered here;
 * AuthorizationNotify.integration.test.ts covers the DB->NOTIFY half. Closing the seam
 * needs a RabbitMQ container and the DtoRouter wired in.
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
import { TokenBroadcaster } from '../TokenBroadcaster';

const PARTNER_ORIGIN = 'http://partner.test';
const PARTNER_TOKENS_URL = `${PARTNER_ORIGIN}/ocpi/cpo/2.2.1/tokens`;
const PARTNER_TOKEN = 'partner-credentials-token';

describe('TokenBroadcaster — outbound OCPI request', () => {
  let stack: OcpiTestStack;
  let broadcaster: TokenBroadcaster;
  let tenant: any;

  beforeAll(async () => {
    stack = await startOcpiTestStack();

    // Mirrors OcpiServer.initContainer(): shouldBroadcastToPartner and
    // handleHttpMethodForPartner both do Container.get(OcpiConfigToken), so the config must
    // be registered or the broadcast is skipped with only a log line.
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
    broadcaster = Container.get(TokenBroadcaster);
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

    const [t]: any[] = await stack.sequelize.query(
      `INSERT INTO "Tenants" (name, "isUserTenant", "countryCode", "partyId", "createdAt", "updatedAt")
       VALUES ('emsp-tenant', false, 'FR', 'EMS', now(), now()) RETURNING id, "countryCode", "partyId"`,
      { type: 'SELECT' as any },
    );
    tenant = t;

    const PARTNER_TOKEN = 'partner-credentials-token';

    // partnerProfileOCPI drives BOTH the Hasura filter (_contains endpoints.identifier)
    // and TokensClientApi.getUrl(). roles must include CPO: for Tokens the eMSP is the
    // Sender, so the receiving partner is a CPO (spec 12.2).
    const profile = {
      credentials: { token: PARTNER_TOKEN },
      roles: [{ role: 'CPO', country_code: 'FR', party_id: 'CPO' }],
      endpoints: [
        {
          identifier: 'tokens_RECEIVER',
          role: 'RECEIVER',
          url: PARTNER_TOKENS_URL,
        },
      ],
    };

    await stack.sequelize.query(
      `INSERT INTO "TenantPartners"
         ("tenantId", "countryCode", "partyId", "partnerProfileOCPI", "createdAt", "updatedAt")
       VALUES (${tenant.id}, 'FR', 'CPO', '${JSON.stringify(profile)}'::jsonb, now(), now())`,
    );
  });

  const authorizationDto = {
    id: 1,
    idToken: 'DEADBEEF',
    idTokenType: 'ISO14443',
    status: 'Accepted',
    updatedAt: '2026-01-01T10:00:00Z',
    additionalInfo: [
      { type: 'eMAID', additionalIdToken: 'FRELCC12345' },
      { type: 'visual_number', additionalIdToken: 'DF000-2001-8999' },
      { type: 'issuer', additionalIdToken: 'Enexflow' },
    ],
  } as any;

  it('PUTs the token to the partner tokens_RECEIVER endpoint', async () => {
    let seen: { path: string; body: any; headers: any } | undefined;

    const scope = nock(PARTNER_ORIGIN)
      .put(/\/ocpi\/cpo\/2\.2\.1\/tokens\/FR\/EMS\/.+/)
      .query(true) // ?type=<TokenType> is appended when token.type is set
      .reply(200, function (uri, body) {
        seen = { path: uri, body, headers: this.req.headers };
        return { status_code: 1000, timestamp: '2026-01-01T10:00:01Z' };
      });

    await broadcaster.broadcastPutToken(tenant, authorizationDto);

    expect(scope.isDone()).toBe(true);
    // PUT must carry the sender's identity in the body (spec 4.1.4.2: a PUT specifies all
    // required fields) — broadcastToken sets these only for PUT, not PATCH.
    expect(seen!.body).toMatchObject({ country_code: 'FR', party_id: 'EMS' });
    // Authorization: the credentials token MUST be Base64-encoded (spec 4.1.2 — it calls
    // out that many 2.1.1/2.2 implementations skip this). The four routing headers are
    // mandatory on functional modules (spec 4.1.8.2).
    expect(seen!.headers).toMatchObject({
      authorization: `Token ${Buffer.from(PARTNER_TOKEN).toString('base64')}`,
      'ocpi-from-country-code': 'FR',
      'ocpi-from-party-id': 'EMS',
      'ocpi-to-country-code': 'FR',
      'ocpi-to-party-id': 'CPO',
    });
  });

  it('does not broadcast to a partner whose roles lack CPO', async () => {
    await stack.sequelize.query(
      `UPDATE "TenantPartners" SET "partnerProfileOCPI" = jsonb_set(
         "partnerProfileOCPI", '{roles}', '[{"role":"EMSP"}]'::jsonb)`,
    );

    const scope = nock(PARTNER_ORIGIN).put(/.*/).reply(200, {});

    await broadcaster.broadcastPutToken(tenant, authorizationDto);

    expect(scope.isDone()).toBe(false);
  });

  it('PATCH sets valid=false on delete and omits the PUT-only identity fields', async () => {
    let seen: any;
    const scope = nock(PARTNER_ORIGIN)
      .patch(/\/tokens\/FR\/EMS\/.+/)
      .query(true)
      .reply(200, function (_uri, body) {
        seen = body;
        return { status_code: 1000, timestamp: '2026-01-01T10:00:01Z' };
      });

    await broadcaster.broadcastDeleteToken(tenant, authorizationDto);

    expect(scope.isDone()).toBe(true);
    expect(seen).toMatchObject({ valid: false });
    expect(seen).not.toHaveProperty('country_code');
  });

  it('DIAGNOSTIC: Hasura returns the seeded partner for tokens_RECEIVER', async () => {
    const { LIST_TENANT_PARTNERS_BY_CPO } =
      await import('../../graphql/index.js');
    const client = Container.get(OcpiGraphqlClient);

    const res: any = await client.request(LIST_TENANT_PARTNERS_BY_CPO, {
      cpoCountryCode: 'FR',
      cpoPartyId: 'EMS',
      endpointIdentifier: 'tokens_RECEIVER',
    });

    console.log('PARTNERS:', JSON.stringify(res, null, 2));
    expect(res.TenantPartners).toHaveLength(1);
  });
});
