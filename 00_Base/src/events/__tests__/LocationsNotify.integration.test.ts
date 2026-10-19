// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

/**
 * CPO push chain, half 1, for Locations. Four triggers, four channels:
 *   Locations        INSERT/UPDATE        -> 'LocationNotification'
 *   Evses            INSERT/UPDATE        -> 'EvseNotification'
 *   Connectors       INSERT/UPDATE        -> 'ConnectorNotification' (carries isStatusChanged)
 *   ConnectorTariffs INSERT/UPDATE/DELETE -> 'ConnectorTariffNotification'
 *
 * Per 03_Modules/Locations/src/index.ts, the only two channels actually consumed by a live
 * (non-commented-out) handler today are:
 *   - ConnectorNotification, when isStatusChanged=true -> broadcastPatchEvseStatus (Gireve's
 *     "Push EVSE Status - ToIOP / PATCH ToIOP_receiver_locations-evse")
 *   - ConnectorTariffNotification -> broadcastPatchConnectorTariffs(Gireve)
 * LocationNotification/EvseNotification are still exercised here (their triggers exist and
 * fire), but LocationsBroadcaster.integration.test.ts is where the two live broadcast paths are
 * covered end-to-end; this file is the DB->NOTIFY half only, mirroring TariffNotify.
 *
 * Seeding note (mirrors the TariffNotify.integration.test.ts header comment, which explicitly
 * deferred ConnectorTariffs to "the Locations test"): ConnectorTariffs.connectorId is NOT NULL
 * in the live DB (despite the model declaring allowNull: true), so a real Connector row is
 * required, which in turn requires a real ChargingStations row (Connectors.stationId is
 * allowNull:false). We seed exactly that minimal chain: Tenants -> ChargingStations -> Connectors
 * (+ Tariffs, for ConnectorTariffs.tariffId) -- Locations/Evses are seeded separately, only for
 * their own trigger tests, and are NOT wired into the ChargingStation used by the connector
 * tests (Connectors/ChargingStations don't require a parent Location to exist).
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import pg from 'pg';
import { startOcpiTestStack } from '../../../../Tests/helpers/setupOcpiTestStack';
import type { OcpiTestStack } from '../../../../Tests/helpers/setupOcpiTestStack';

type Received = {
  channel: string;
  operation: string;
  isStatusChanged?: boolean;
  data: any;
};

describe('LocationNotify / EvseNotify / ConnectorNotify / ConnectorTariffNotify triggers', () => {
  let stack: OcpiTestStack;
  let listener: pg.Client;
  let received: Received[];
  let tenantId: number;
  let stationId: string;

  beforeAll(async () => {
    stack = await startOcpiTestStack();
    listener = new pg.Client({ connectionString: stack.pgConnectionString });
    await listener.connect();
    await listener.query('LISTEN "LocationNotification"');
    await listener.query('LISTEN "EvseNotification"');
    await listener.query('LISTEN "ConnectorNotification"');
    await listener.query('LISTEN "ConnectorTariffNotification"');
    listener.on('notification', (msg) => {
      const p = JSON.parse(msg.payload ?? '{}');
      received.push({
        channel: msg.channel,
        operation: p.operation,
        isStatusChanged: p.isStatusChanged,
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
      'Connectors',
      'Evses',
      'Tariffs',
      'ChargingStations',
      'Locations',
      'Tenants',
    ]);
    received = [];
    stationId = `ST-${Date.now()}`;

    const [t]: any[] = await stack.sequelize.query(
      `INSERT INTO "Tenants" (name, "isUserTenant", "countryCode", "partyId", "createdAt", "updatedAt")
       VALUES ('cpo-tenant', false, 'FR', 'CPO', now(), now()) RETURNING id`,
      { type: 'SELECT' as any },
    );
    tenantId = t.id;

    // ChargingStations.locationId is NOT NULL in the live schema (even though the bundled
    // sequelize model snapshot allows null), so every Connector/Evse test needs a real parent
    // Location + ChargingStation. This "base" Location is unrelated to the dedicated
    // LocationNotification test below, which seeds its own separate Location row.
    const [loc]: any[] = await stack.sequelize.query(
      `INSERT INTO "Locations" ("tenantId", "createdAt", "updatedAt")
       VALUES (${tenantId}, now(), now()) RETURNING id`,
      { type: 'SELECT' as any },
    );

    await stack.sequelize.query(
      `INSERT INTO "ChargingStations" (id, "locationId", "tenantId", "createdAt", "updatedAt")
       VALUES ('${stationId}', ${loc.id}, ${tenantId}, now(), now())`,
    );

    // The Location insert above fires its own LocationNotification; settle and discard it so
    // it doesn't leak into the first assertion of whichever test runs next.
    await resetNotifications();
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

  async function seedConnector(status = 'Available'): Promise<number> {
    const [row]: any[] = await stack.sequelize.query(
      `INSERT INTO "Connectors" ("stationId", "connectorId", status, "tenantId", "createdAt", "updatedAt")
       VALUES ('${stationId}', 1, '${status}', ${tenantId}, now(), now())
       RETURNING id`,
      { type: 'SELECT' as any },
    );
    return row.id;
  }

  async function seedTariff(ocpiTariffId: string): Promise<number> {
    // Tariffs has no stationId/pricePerKwh column (see Tariffs_ocpiTariffId_tenantPartnerId_key);
    // a distinct ocpiTariffId per call is what keeps two tariffs seeded in the same test from
    // colliding on that unique index (tenantPartnerId stays NULL for both, marking them "own").
    const [row]: any[] = await stack.sequelize.query(
      `INSERT INTO "Tariffs"
         (currency, "ocpiTariffId", "tenantId", "startDateTime", "createdAt", "updatedAt")
       VALUES ('EUR', '${ocpiTariffId}', ${tenantId}, now(), now(), now())
       RETURNING id`,
      { type: 'SELECT' as any },
    );
    return row.id;
  }

  async function linkConnectorTariff(
    connectorId: number,
    tariffId: number,
    tariffOcpiId: string,
  ): Promise<number> {
    const [row]: any[] = await stack.sequelize.query(
      `INSERT INTO "ConnectorTariffs"
         ("connectorId", "connectorOcpiId", "tariffId", "tariffOcpiId", "tenantId", "createdAt", "updatedAt")
       VALUES (${connectorId}, 'OCPI-'||${connectorId}, ${tariffId}, '${tariffOcpiId}', ${tenantId}, now(), now())
       RETURNING id`,
      { type: 'SELECT' as any },
    );
    return row.id;
  }

  it('Locations INSERT notifies on LocationNotification with the tenant embedded', async () => {
    await stack.sequelize.query(
      `INSERT INTO "Locations" ("tenantId", "createdAt", "updatedAt")
       VALUES (${tenantId}, now(), now())`,
    );

    const [n] = await waitFor();
    expect(n.channel).toBe('LocationNotification');
    expect(n.operation).toBe('INSERT');
    expect(n.data.tenant).toMatchObject({ countryCode: 'FR', partyId: 'CPO' });
  });

  it('Evses INSERT notifies on EvseNotification', async () => {
    await stack.sequelize.query(
      `INSERT INTO "Evses" ("tenantId", "stationId", "evseTypeId", "createdAt", "updatedAt")
       VALUES (${tenantId}, '${stationId}', 3, now(), now())`,
    );

    const [n] = await waitFor();
    expect(n.channel).toBe('EvseNotification');
    expect(n.operation).toBe('INSERT');
  });

  it('Connectors INSERT notifies on ConnectorNotification with isStatusChanged=true', async () => {
    await seedConnector();

    const [n] = await waitFor();
    expect(n.channel).toBe('ConnectorNotification');
    expect(n.operation).toBe('INSERT');
    expect(n.isStatusChanged).toBe(true);
  });

  it('Connectors UPDATE changing status notifies with isStatusChanged=true', async () => {
    const id = await seedConnector();
    await resetNotifications();

    await stack.sequelize.query(
      `UPDATE "Connectors" SET status = 'Charging', "updatedAt" = now() WHERE id = ${id}`,
    );

    const [n] = await waitFor();
    expect(n.operation).toBe('UPDATE');
    expect(n.isStatusChanged).toBe(true);
    expect(n.data.status).toBe('Charging');
  });

  it('Connectors UPDATE changing a non-status field notifies with isStatusChanged=false', async () => {
    const id = await seedConnector();
    await resetNotifications();

    await stack.sequelize.query(
      `UPDATE "Connectors" SET "maximumAmperage" = 32, "updatedAt" = now() WHERE id = ${id}`,
    );

    const [n] = await waitFor();
    expect(n.operation).toBe('UPDATE');
    expect(n.isStatusChanged).toBe(false);
  });

  it('ConnectorTariffs INSERT notifies on ConnectorTariffNotification with the full own tariff_ids list', async () => {
    const connectorId = await seedConnector();
    const tariffId = await seedTariff('TARIFF-1');
    await resetNotifications();

    await linkConnectorTariff(connectorId, tariffId, 'TARIFF-1');

    const [n] = await waitFor();
    expect(n.channel).toBe('ConnectorTariffNotification');
    expect(n.operation).toBe('INSERT');
    expect(n.data.connectorId).toBe(connectorId);
    expect(n.data.tariff_ids).toEqual(['TARIFF-1']);
    expect(n.data.tenant).toMatchObject({ countryCode: 'FR', partyId: 'CPO' });
  });

  it('ConnectorTariffs DELETE notifies as DELETE with the remaining tariff_ids list', async () => {
    const connectorId = await seedConnector();
    const tariffId1 = await seedTariff('TARIFF-1');
    const tariffId2 = await seedTariff('TARIFF-2');
    const ct1 = await linkConnectorTariff(connectorId, tariffId1, 'TARIFF-1');
    await linkConnectorTariff(connectorId, tariffId2, 'TARIFF-2');
    await resetNotifications();

    await stack.sequelize.query(
      `DELETE FROM "ConnectorTariffs" WHERE id = ${ct1}`,
    );

    const [n] = await waitFor();
    expect(n.operation).toBe('DELETE');
    expect(n.data.tariff_ids).toEqual(['TARIFF-2']);
  });

  it('ConnectorTariffs linked to a partner (tenantPartnerId set) does not notify', async () => {
    const connectorId = await seedConnector();
    const tariffId = await seedTariff('TARIFF-1');
    // A roaming-partner-owned tariff link (tenantPartnerId set) is not "own" data — the trigger
    // returns early for these, mirroring the CPO/eMSP boundary elsewhere in the schema.
    const [partnerTenant]: any[] = await stack.sequelize.query(
      `INSERT INTO "TenantPartners" ("tenantId", "countryCode", "partyId", "partnerProfileOCPI", "createdAt", "updatedAt")
       VALUES (${tenantId}, 'FR', 'EMS', '{}'::jsonb, now(), now()) RETURNING id`,
      { type: 'SELECT' as any },
    );
    await resetNotifications();

    await stack.sequelize.query(
      `INSERT INTO "ConnectorTariffs"
         ("connectorId", "connectorOcpiId", "tariffId", "tariffOcpiId", "tenantId", "tenantPartnerId", "createdAt", "updatedAt")
       VALUES (${connectorId}, 'OCPI-${connectorId}', ${tariffId}, 'TARIFF-1', ${tenantId}, ${partnerTenant.id}, now(), now())`,
    );

    await new Promise((r) => setTimeout(r, 300));
    expect(received).toHaveLength(0);
  });
});
