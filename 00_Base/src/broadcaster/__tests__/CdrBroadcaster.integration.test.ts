// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

/**
 * CPO push chain, half 2, for CDRs — same shape as SessionsBroadcaster.integration.test.ts.
 *
 * Unlike SessionBroadcaster, CdrBroadcaster's own mapping (CdrMapper.mapTransactionsToCdrs ->
 * BaseTransactionMapper.getOcpiTariffsForTransactions) ALWAYS does a real GET_TARIFF_BY_KEY_QUERY
 * lookup to build the OCPI Tariff embedded in the CDR, regardless of whether the TransactionDto
 * already carries an inline `tariff` object (that inline object only satisfies the *other*,
 * guarded, tariff lookup used for cost calculation). So — unlike Sessions — this test DOES seed
 * a real Tariffs/TariffElements row, the same way TariffsBroadcaster.integration.test.ts does.
 *
 * CdrBroadcaster also writes to Postgres itself before broadcasting (CdrsService.insertSentCdr
 * writes a "sent CDR" row, then markCdrAsSent flips successfullySentAt on a delivered response),
 * so this test also asserts that DB side effect directly, which none of the other broadcaster
 * tests need to.
 *
 * SEAM: production reaches this broadcaster via 03_Modules/Sessions/src/index.ts's
 * handleTransactionUpdate, when isActive flips to false — the same 'TransactionNotification'
 * trigger/handler already covered by SessionsNotify.integration.test.ts and
 * SessionsBroadcaster.integration.test.ts. There is no CDR-specific DB trigger, so no separate
 * CdrsNotify.integration.test.ts is needed.
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
import { CdrBroadcaster } from '../CdrBroadcaster';

const PARTNER_ORIGIN = 'http://partner.test';
const PARTNER_CDRS_URL = `${PARTNER_ORIGIN}/ocpi/emsp/2.2.1/cdrs`;
const PARTNER_TOKEN = 'partner-credentials-token';
const OCPI_TARIFF_ID = 'TARIFF-1';

describe('CdrBroadcaster — outbound OCPI request', () => {
  let stack: OcpiTestStack;
  let broadcaster: CdrBroadcaster;
  let tenant: any;
  let partnerId: number;
  let dbTariffId: number;

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
      gireve: { countryCode: 'FR', partyId: 'GRV' },
    } as any);
    Container.set(Logger, new Logger({ minLevel: 6 }));
    Container.set(
      OcpiGraphqlClient,
      new OcpiGraphqlClient(stack.graphqlEndpoint, stack.graphqlHeaders),
    );
    broadcaster = Container.get(CdrBroadcaster);
    if (!nock.isActive()) nock.activate();

    // nock.disableNetConnect();
    // nock.emitter.on('no match', (req: any) => {
    //   console.log(
    //     'NOCK NO MATCH:',
    //     req.method,
    //     req.options?.host ?? req.host,
    //     req.path,
    //   );
    // });
    // nock.enableNetConnect(/(localhost|127\.0\.0\.1)/);
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
      'Cdrs',
      'TariffElements',
      'Tariffs',
      'TenantPartners',
      'Tenants',
    ]);

    // CDRs are owned by the CPO (spec 10), same as Sessions/Tariffs: CPO is Sender.
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
          identifier: 'cdrs_RECEIVER',
          role: 'RECEIVER',
          url: PARTNER_CDRS_URL,
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

    // CdrMapper (unlike SessionMapper) always does a real GET_TARIFF_BY_KEY_QUERY lookup to
    // build the OCPI Tariff embedded in the CDR, even when the TransactionDto already carries
    // an inline `tariff` object — so a real row is required here.
    const [tariff]: any[] = await stack.sequelize.query(
      `INSERT INTO "Tariffs"
         (currency, "ocpiTariffId", "tenantId", "startDateTime", "createdAt", "updatedAt")
       VALUES ('EUR', '${OCPI_TARIFF_ID}', ${tenant.id}, now(), now(), now())
       RETURNING id`,
      { type: 'SELECT' as any },
    );
    dbTariffId = tariff.id;

    await stack.sequelize.query(
      `INSERT INTO "TariffElements" ("tariffId", "priceComponents", "createdAt", "updatedAt")
       VALUES (${dbTariffId}, '[{"type":"ENERGY","price":0.42,"step_size":1}]'::jsonb, now(), now())`,
    );
  });

  function buildTransactionDto(overrides: Record<string, any> = {}) {
    return {
      // id intentionally omitted: CdrBroadcaster passes transactionDto.id as
      // Cdrs.transactionId (FK to real Transactions), and leaving it undefined
      // resolves to null so no real Transactions row needs seeding here.
      transactionId: 'TX-1',
      stationId: 'ST-1',
      evseId: 1,
      connectorId: 1,
      locationId: 10,
      tariffId: dbTariffId,
      authorizationId: 30,
      isActive: false,
      chargingState: 'Charging',
      totalKwh: 5.5,
      startTime: '2026-01-01T10:00:00Z',
      endTime: '2026-01-01T11:00:00Z',
      createdAt: '2026-01-01T09:59:00Z',
      updatedAt: '2026-01-01T11:00:00Z',
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
          tenant: { id: tenant.id },
        },
      },
      tariff: {
        id: dbTariffId,
        currency: 'EUR',
        ocpiTariffId: OCPI_TARIFF_ID,
        taxRate: 10,
        TariffElements: [
          { priceComponents: [{ type: 'ENERGY', price: 0.42, vat: 10 }] },
        ],
      },
      ...overrides,
    } as any;
  }

  async function findSentCdr(ocpiCdrId: string) {
    const [row]: any[] = await stack.sequelize.query(
      `SELECT id, "successfullySentAt" FROM "Cdrs" WHERE "ocpiCdrId" = '${ocpiCdrId}' AND "toTenantPartnerId" = ${partnerId}`,
      { type: 'SELECT' as any },
    );
    return row;
  }

  it('POSTs the mapped CDR to the partner and marks it as sent on a delivered response', async () => {
    let seen: { path: string; body: any; headers: any } | undefined;

    const scope = nock(PARTNER_ORIGIN)
      .post('/ocpi/emsp/2.2.1/cdrs')
      .reply(200, function (uri, body) {
        seen = { path: uri, body, headers: this.req.headers };
        return { status_code: 1000, timestamp: '2026-01-01T11:00:01Z' };
      });

    const transactionDto = buildTransactionDto();
    await broadcaster.broadcastPostCdr(transactionDto);

    expect(scope.isDone()).toBe(true);
    expect(seen!.body).toMatchObject({
      id: 'TX-1',
      currency: 'EUR',
      total_energy: 5.5,
      cdr_location: expect.objectContaining({
        evse_id: 'FR*CPO*E0001',
      }),
    });
    // Real BaseTransactionMapper.getOcpiTariffsForTransactions -> GET_TARIFF_BY_KEY_QUERY ->
    // TariffMapper.mapForSender over the seeded Tariffs/TariffElements row.
    expect(seen!.body.tariffs).toHaveLength(1);
    expect(seen!.body.tariffs[0]).toMatchObject({ id: OCPI_TARIFF_ID });

    expect(seen!.headers).toMatchObject({
      authorization: `Token ${Buffer.from(PARTNER_TOKEN).toString('base64')}`,
      'ocpi-from-country-code': 'FR',
      'ocpi-from-party-id': 'CPO',
      'ocpi-to-country-code': 'FR',
      'ocpi-to-party-id': 'EMS',
    });

    const sentRow = await findSentCdr('TX-1');
    expect(sentRow).toBeDefined();
    expect(sentRow.successfullySentAt).not.toBeNull();
  });

  it('stores the CDR but does not mark it sent when the response is not a delivered success', async () => {
    const scope = nock(PARTNER_ORIGIN)
      .post('/ocpi/emsp/2.2.1/cdrs')
      .reply(200, { status_code: 2000, timestamp: '2026-01-01T11:00:01Z' });

    const transactionDto = buildTransactionDto();
    await broadcaster.broadcastPostCdr(transactionDto);

    expect(scope.isDone()).toBe(true);
    const sentRow = await findSentCdr('TX-1');
    expect(sentRow).toBeDefined();
    expect(sentRow.successfullySentAt).toBeNull();
  });

  it('does not broadcast (or store a CDR) for a still-active transaction', async () => {
    const scope = nock(PARTNER_ORIGIN).post(/.*/).reply(200, {});

    const transactionDto = buildTransactionDto({
      isActive: true,
      endTime: undefined,
    });
    await broadcaster.broadcastPostCdr(transactionDto);

    expect(scope.isDone()).toBe(false);
    const sentRow = await findSentCdr('TX-1');
    expect(sentRow).toBeUndefined();
  });

  it('does not broadcast (or store a CDR) when there is no token owner partner', async () => {
    const scope = nock(PARTNER_ORIGIN).post(/.*/).reply(200, {});

    const transactionDto = buildTransactionDto({
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
        // tenantPartner intentionally omitted: no token owner to broadcast to.
      },
    });
    await broadcaster.broadcastPostCdr(transactionDto);

    expect(scope.isDone()).toBe(false);
    const sentRow = await findSentCdr('TX-1');
    expect(sentRow).toBeUndefined();
  });
});
