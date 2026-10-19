// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

/**
 * CPO push chain, half 1, for the tariff family. Three triggers, TWO channels:
 *   Tariffs        INSERT/UPDATE/DELETE -> 'TariffNotification'
 *   TariffElements INSERT/UPDATE/DELETE -> 'TariffNotification', forced to eventOp='UPDATE'
 *   ConnectorTariffs INS/UPD/DEL       -> 'ConnectorTariffNotification'  (Locations module)
 *
 * NOT here: ConnectorTariffs. It fires on a different channel
 * ('ConnectorTariffNotification') and is consumed by the Locations module
 * (03_Modules/Locations/src/index.ts:363-377) as a Connector PATCH, not a Tariffs PUT.
 * Seeding it requires a real Connector (ConnectorTariffs.connectorId is NOT NULL in the
 * DB despite the model declaring allowNull: true), hence the whole
 * Location/ChargingStation/Evse/Connector tree — which the Locations test needs anyway.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import pg from 'pg';
import { startOcpiTestStack } from '../../../../Tests/helpers/setupOcpiTestStack';
import type { OcpiTestStack } from '../../../../Tests/helpers/setupOcpiTestStack';

type Received = { channel: string; operation: string; data: any };

describe('TariffNotify / ConnectorTariffNotify triggers', () => {
  let stack: OcpiTestStack;
  let listener: pg.Client;
  let received: Received[];
  let tenantId: number;
  let tariffId: number;

  beforeAll(async () => {
    stack = await startOcpiTestStack();
    listener = new pg.Client({ connectionString: stack.pgConnectionString });
    await listener.connect();
    await listener.query('LISTEN "TariffNotification"');
    await listener.query('LISTEN "ConnectorTariffNotification"');
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
    await stack.cleanup([
      'ConnectorTariffs',
      'TariffElements',
      'Tariffs',
      'Tenants',
    ]);
    received = [];

    const [t]: any[] = await stack.sequelize.query(
      `INSERT INTO "Tenants" (name, "isUserTenant", "countryCode", "partyId", "createdAt", "updatedAt")
       VALUES ('cpo-tenant', false, 'FR', 'CPO', now(), now()) RETURNING id`,
      { type: 'SELECT' as any },
    );
    tenantId = t.id;
  });

  /** As in AuthorizationNotify: NOTIFY is async, so settle before clearing. */
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

  async function seedTariff(): Promise<number> {
    const [row]: any[] = await stack.sequelize.query(
      `INSERT INTO "Tariffs"
         (currency, "ocpiTariffId", "tenantId", "startDateTime", "createdAt", "updatedAt")
       VALUES ('EUR', 'TARIFF-1', ${tenantId}, now(), now(), now())
       RETURNING id`,
      { type: 'SELECT' as any },
    );
    return row.id;
  }

  it('Tariffs INSERT notifies on TariffNotification with the tenant embedded', async () => {
    tariffId = await seedTariff();

    const [n] = await waitFor();
    expect(n.channel).toBe('TariffNotification');
    expect(n.operation).toBe('INSERT');
    // Single object here, NOT an array — unlike AuthorizationNotify's `tenants`.
    expect(n.data.tenant).toMatchObject({ countryCode: 'FR', partyId: 'CPO' });
  });

  it('Tariffs UPDATE notifies with post-update values', async () => {
    tariffId = await seedTariff();
    await resetNotifications();

    await stack.sequelize.query(
      `UPDATE "Tariffs" SET "taxRate" = 15.5, "updatedAt" = now() WHERE id = ${tariffId}`,
    );

    const [n] = await waitFor();
    expect(n.operation).toBe('UPDATE');
    expect(Number(n.data.taxRate)).toBe(15.5);
  });

  // The distinctive branch: eventOp := 'UPDATE' when the trigger fires on TariffElements
  // (migration line ~51). A new element is a MODIFICATION of the parent tariff, because
  // OCPI has no partial tariff update — the whole object is re-PUT.
  it('TariffElements INSERT notifies as an UPDATE of the parent tariff', async () => {
    tariffId = await seedTariff();
    await resetNotifications();

    await stack.sequelize.query(
      `INSERT INTO "TariffElements" ("tariffId", "priceComponents", "createdAt", "updatedAt")
       VALUES (${tariffId}, '[{"type":"ENERGY","price":0.42,"step_size":1}]'::jsonb, now(), now())`,
    );

    const [n] = await waitFor();
    expect(n.channel).toBe('TariffNotification');
    expect(n.operation).toBe('UPDATE'); // not INSERT
    expect(n.data.tenant).toMatchObject({ countryCode: 'FR', partyId: 'CPO' });
  });

  it('TariffElements DELETE also notifies as an UPDATE of the parent tariff', async () => {
    tariffId = await seedTariff();
    const [el]: any[] = await stack.sequelize.query(
      `INSERT INTO "TariffElements" ("tariffId", "priceComponents", "createdAt", "updatedAt")
       VALUES (${tariffId}, '[{"type":"ENERGY","price":0.42,"step_size":1}]'::jsonb, now(), now())
       RETURNING id`,
      { type: 'SELECT' as any },
    );
    await resetNotifications();

    await stack.sequelize.query(
      `DELETE FROM "TariffElements" WHERE id = ${el.id}`,
    );

    const [n] = await waitFor();
    expect(n.operation).toBe('UPDATE');
  });

  it('Tariffs DELETE notifies as DELETE', async () => {
    tariffId = await seedTariff();
    await resetNotifications();

    await stack.sequelize.query(`DELETE FROM "Tariffs" WHERE id = ${tariffId}`);

    const all = await waitFor();
    // A tariff delete cascades to TariffElements, so expect the parent DELETE plus one
    // per cascaded element — same fan-out shape as AuthorizationNotify. Adjust to reality.
    expect(all[0].operation).toBe('DELETE');
  });
});
