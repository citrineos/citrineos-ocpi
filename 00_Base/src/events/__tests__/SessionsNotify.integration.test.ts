// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

/**
 * CPO push chain, half 1, for Sessions. One trigger, one channel:
 *   Transactions INSERT/UPDATE -> 'TransactionNotification'
 *
 * Same shape as TariffNotify.integration.test.ts: connect a raw pg.Client, LISTEN on the
 * channel, seed via raw SQL, and assert on the notification payload. "stationId" is left NULL
 * on every seeded row so this file never needs a real ChargingStations row (Transactions.
 * stationId is nullable, and leaving it NULL sidesteps any FK-to-ChargingStations question
 * entirely) — this test is only about the trigger's own INSERT/UPDATE/requiredFields logic,
 * not about the Location/ChargingStation tree (see LocationsNotify.integration.test.ts for that).
 *
 * NOT here: the module handler (03_Modules/Sessions/src/index.ts) re-fetching the full
 * transaction via GraphQL and mapping it to an OCPI Session — that is covered, with the
 * broadcaster called directly, by SessionsBroadcaster.integration.test.ts.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import pg from 'pg';
import { startOcpiTestStack } from '../../../../Tests/helpers/setupOcpiTestStack';
import type { OcpiTestStack } from '../../../../Tests/helpers/setupOcpiTestStack';

type Received = { channel: string; operation: string; data: any };

describe('TransactionNotify trigger', () => {
  let stack: OcpiTestStack;
  let listener: pg.Client;
  let received: Received[];
  let tenantId: number;

  beforeAll(async () => {
    stack = await startOcpiTestStack();
    listener = new pg.Client({ connectionString: stack.pgConnectionString });
    await listener.connect();
    await listener.query('LISTEN "TransactionNotification"');
    listener.on('notification', (msg) => {
      const p = JSON.parse(msg.payload ?? '{}');
      received.push({
        channel: msg.channel,
        operation: p.operation,
        data: p.data,
      });
    });
  });

  afterAll(async () => {
    await listener?.end();
    await stack?.stop();
  });

  beforeEach(async () => {
    await stack.cleanup(['Transactions', 'Tenants']);
    received = [];

    const [t]: any[] = await stack.sequelize.query(
      `INSERT INTO "Tenants" (name, "isUserTenant", "countryCode", "partyId", "createdAt", "updatedAt")
       VALUES ('cpo-tenant', false, 'FR', 'CPO', now(), now()) RETURNING id`,
      { type: 'SELECT' as any },
    );
    tenantId = t.id;
  });

  /** NOTIFY is async, so settle before clearing (as in TariffNotify.integration.test.ts). */
  async function resetNotifications(quietMs = 200, maxRounds = 15) {
    let previous = -1;
    for (let i = 0; i < maxRounds && previous !== received.length; i++) {
      previous = received.length;
      await new Promise((r) => setTimeout(r, quietMs));
    }
    received = [];
  }

  async function waitFor(min = 1, timeoutMs = 5_000) {
    for (let i = 0; i < timeoutMs / 50; i++) {
      if (received.length >= min) {
        await new Promise((r) => setTimeout(r, 100));
        return received;
      }
      await new Promise((r) => setTimeout(r, 50));
    }
    throw new Error(
      `expected >=${min} notification(s), got ${received.length}`,
    );
  }

  async function seedTransaction(transactionId = 'TX-1'): Promise<number> {
    const [row]: any[] = await stack.sequelize.query(
      `INSERT INTO "Transactions"
         ("transactionId", "tenantId", "isActive", "totalKwh", "chargingState", "createdAt", "updatedAt")
       VALUES ('${transactionId}', ${tenantId}, true, 0, 'Charging', now(), now())
       RETURNING id`,
      { type: 'SELECT' as any },
    );
    return row.id;
  }

  it('Transactions INSERT notifies on TransactionNotification with the tenant embedded', async () => {
    await seedTransaction();

    const [n] = await waitFor();
    expect(n.channel).toBe('TransactionNotification');
    expect(n.operation).toBe('INSERT');
    expect(n.data.tenant).toMatchObject({ countryCode: 'FR', partyId: 'CPO' });
    expect(n.data.transactionId).toBe('TX-1');
  });

  it('Transactions UPDATE (meter progress) notifies with post-update values', async () => {
    const id = await seedTransaction();
    await resetNotifications();

    await stack.sequelize.query(
      `UPDATE "Transactions" SET "totalKwh" = 12.5, "updatedAt" = now() WHERE id = ${id}`,
    );

    const [n] = await waitFor();
    expect(n.operation).toBe('UPDATE');
    expect(Number(n.data.totalKwh)).toBe(12.5);
  });

  it('Transactions UPDATE changing only chargingState still notifies (not a required field)', async () => {
    const id = await seedTransaction();
    await resetNotifications();

    await stack.sequelize.query(
      `UPDATE "Transactions" SET "chargingState" = 'SuspendedEV', "updatedAt" = now() WHERE id = ${id}`,
    );

    const [n] = await waitFor();
    expect(n.operation).toBe('UPDATE');
    expect(n.data.chargingState).toBe('SuspendedEV');
  });

  it('Transactions UPDATE marking isActive=false (end of session) notifies', async () => {
    const id = await seedTransaction();
    await resetNotifications();

    await stack.sequelize.query(
      `UPDATE "Transactions" SET "isActive" = false, "endTime" = now(), "updatedAt" = now() WHERE id = ${id}`,
    );

    const [n] = await waitFor();
    expect(n.operation).toBe('UPDATE');
    expect(n.data.isActive).toBe(false);
  });

  // The distinctive branch, shared with TariffNotify/LocationNotify/ConnectorNotify: an UPDATE
  // that only touches a *required* field (id/transactionId/tenantId/updatedAt) — with nothing
  // else changed — must NOT notify at all.
  it('UPDATE touching only updatedAt (a required field) does not notify', async () => {
    const id = await seedTransaction();
    await resetNotifications();

    await stack.sequelize.query(
      `UPDATE "Transactions" SET "updatedAt" = now() WHERE id = ${id}`,
    );

    await new Promise((r) => setTimeout(r, 300));
    expect(received).toHaveLength(0);
  });
});
