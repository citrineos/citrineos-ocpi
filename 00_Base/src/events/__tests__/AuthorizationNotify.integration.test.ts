// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

/**
 * Half 1 of the CPO push chain: a real DB write must produce a pg NOTIFY with the payload
 * the DtoRouter/TokensModule handlers expect. Asserted with a raw LISTEN rather than
 * through RabbitMQ — see AuthorizationNotify.broadcast test for half 2, and the note there
 * about the broker seam.
 *
 * Guards migrations/20260424151711_notification_authorizationstenant.ts: the triggers fire
 * on AuthorizationTenants INSERT/UPDATE/DELETE, Authorizations UPDATE, and BEFORE DELETE on
 * Authorizations. The `tenants` array is the part handlers depend on and the part a careless
 * migration edit drops.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import pg from 'pg';
import { startOcpiTestStack } from '../../../../Tests/helpers/setupOcpiTestStack';
import type { OcpiTestStack } from '../../../../Tests/helpers/setupOcpiTestStack';

const CHANNEL = 'AuthorizationNotification';

describe('AuthorizationNotify trigger', () => {
  let stack: OcpiTestStack;
  let listener: pg.Client;
  let received: Array<{ operation: string; data: any }>;

  beforeAll(async () => {
    stack = await startOcpiTestStack();

    listener = new pg.Client({ connectionString: stack.pgConnectionString });
    await listener.connect();
    await listener.query(`LISTEN "${CHANNEL}"`);
    listener.on('notification', (msg) => {
      received.push(JSON.parse(msg.payload ?? '{}'));
    });
  });

  afterAll(async () => {
    await listener?.end();
    await stack?.stop();
  });

  beforeEach(async () => {
    // TRUNCATE does not fire row-level triggers, so cleanup never pollutes `received` —
    // but clear after it anyway so the ordering of these two lines can't matter later.
    await stack.cleanup(['AuthorizationTenants', 'Authorizations', 'Tenants']);
    received = [];
  });

  /** NOTIFY delivery is async; poll for at least `min` notifications rather than sleeping. */
  async function waitForNotifications(min = 1, timeoutMs = 5_000) {
    for (let i = 0; i < timeoutMs / 50; i++) {
      if (received.length >= min) {
        // One extra beat: lets any surplus notification land so tests can assert on the
        // total, instead of racing and seeing only the first.
        await new Promise((r) => setTimeout(r, 100));
        return received;
      }
      await new Promise((r) => setTimeout(r, 50));
    }
    throw new Error(
      `expected >=${min} ${CHANNEL} notification(s) within ${timeoutMs}ms, got ${received.length}`,
    );
  }

  async function seedTenant(
    countryCode: string,
    partyId: string,
  ): Promise<number> {
    const [row]: any[] = await stack.sequelize.query(
      `INSERT INTO "Tenants" (name, "isUserTenant", "countryCode", "partyId", "createdAt", "updatedAt")
       VALUES ('tenant-${partyId}', false, '${countryCode}', '${partyId}', now(), now())
       RETURNING id`,
      { type: 'SELECT' as any },
    );
    return row.id;
  }

  async function seedAuthorization(idToken = 'DEADBEEF'): Promise<number> {
    const [row]: any[] = await stack.sequelize.query(
      `INSERT INTO "Authorizations" ("idToken", "idTokenType", "createdAt", "updatedAt")
       VALUES ('${idToken}', 'ISO14443', now(), now()) RETURNING id`,
      { type: 'SELECT' as any },
    );
    return row.id;
  }

  async function link(
    authorizationId: number,
    tenantId: number,
  ): Promise<void> {
    await stack.sequelize.query(
      `INSERT INTO "AuthorizationTenants" ("authorizationId", "tenantId", "createdAt", "updatedAt")
       VALUES (${authorizationId}, ${tenantId}, now(), now())`,
    );
  }

  /**
   * Setup writes (the link() INSERTs) fire triggers whose NOTIFY is delivered
   * asynchronously, so a synchronous `received = []` races and leaves stragglers to be
   * counted by the next assertion. Wait until the queue stops growing, then clear.
   */
  async function resetNotifications(quietMs = 200, maxRounds = 15) {
    let previous = -1;
    for (let i = 0; i < maxRounds && previous !== received.length; i++) {
      previous = received.length;
      await new Promise((r) => setTimeout(r, quietMs));
    }
    received = [];
  }

  it('fires on AuthorizationTenants INSERT with the linked tenant embedded', async () => {
    const tenantId = await seedTenant('FR', 'EMS');
    const authId = await seedAuthorization();

    await link(authId, tenantId);

    const [notification] = await waitForNotifications();
    expect(notification.operation).toBe('INSERT');
    expect(notification.data.idToken).toBe('DEADBEEF');
    // The handler loops over data.tenants and skips the broadcast entirely when it is
    // empty — an empty array here is a silent production outage, not a test nit.
    expect(notification.data.tenants).toHaveLength(1);
    expect(notification.data.tenants[0]).toMatchObject({
      countryCode: 'FR',
      partyId: 'EMS',
    });
  });

  // Trigger "AuthorizationNotification": AFTER UPDATE ON "Authorizations".
  // Drives TokensModule.handleAuthorizationUpdate -> broadcastPatchToken.
  it('fires on Authorizations UPDATE with post-update data and every linked tenant', async () => {
    const tenantA = await seedTenant('FR', 'EMS');
    const tenantB = await seedTenant('DE', 'EMS');
    const authId = await seedAuthorization();
    await link(authId, tenantA);
    await link(authId, tenantB);
    await resetNotifications();

    await stack.sequelize.query(
      `UPDATE "Authorizations" SET "idToken" = 'CAFEBABE', "updatedAt" = now() WHERE id = ${authId}`,
    );

    const [notification] = await waitForNotifications();
    expect(notification.operation).toBe('UPDATE');
    // AFTER UPDATE + a SELECT in the trigger body: the payload must carry the NEW value.
    expect(notification.data.idToken).toBe('CAFEBABE');
    // Both partners must be told, or one keeps a stale token.
    expect(notification.data.tenants).toHaveLength(2);
    expect(
      notification.data.tenants.map((t: any) => t.countryCode).sort(),
    ).toEqual(['DE', 'FR']);
  });

  // Trigger "AuthorizationTenantNotification": AFTER DELETE ON "AuthorizationTenants".
  // The trigger deliberately reports ONLY the unlinked tenant (OLD."tenantId"), not the
  // whole join — unlinking one partner must not tell the others their token is invalid.
  it('fires on AuthorizationTenants DELETE with only the unlinked tenant', async () => {
    const tenantA = await seedTenant('FR', 'EMS');
    const tenantB = await seedTenant('DE', 'EMS');
    const authId = await seedAuthorization();
    await link(authId, tenantA);
    await link(authId, tenantB);
    await resetNotifications();

    await stack.sequelize.query(
      `DELETE FROM "AuthorizationTenants" WHERE "authorizationId" = ${authId} AND "tenantId" = ${tenantA}`,
    );

    const [notification] = await waitForNotifications();
    expect(notification.operation).toBe('DELETE');
    expect(notification.data.tenants).toHaveLength(1);
    expect(notification.data.tenants[0]).toMatchObject({
      countryCode: 'FR',
      partyId: 'EMS',
    });
  });

  // Trigger "AuthorizationDeleteNotification": BEFORE DELETE ON "Authorizations".
  // BEFORE, so the AuthorizationTenants rows still exist and the join still resolves; the
  // authorization payload comes from OLD rather than a SELECT.
  it('fires on Authorizations DELETE with OLD data, then once more per cascaded link', async () => {
    const tenantA = await seedTenant('FR', 'EMS');
    const tenantB = await seedTenant('DE', 'EMS');
    const authId = await seedAuthorization();
    await link(authId, tenantA);
    await link(authId, tenantB);
    await resetNotifications();

    await stack.sequelize.query(
      `DELETE FROM "Authorizations" WHERE id = ${authId}`,
    );

    // 1 from BEFORE DELETE on Authorizations, then 1 per AuthorizationTenants row the
    // cascade removes. Documenting the count matters: each one reaches a handler, so a
    // single logical delete fans out into several broadcasts.
    const all = await waitForNotifications(3);
    expect(all).toHaveLength(3);

    const [first] = all;
    expect(first.operation).toBe('DELETE');
    expect(first.data.idToken).toBe('DEADBEEF');
    expect(first.data.tenants).toHaveLength(2);
  });
});
