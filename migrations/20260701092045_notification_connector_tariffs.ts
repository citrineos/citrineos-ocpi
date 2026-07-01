// SPDX-FileCopyrightText: 2026 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

'use strict';

import type { QueryInterface } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION "ConnectorTariffNotify"()
      RETURNS trigger AS $$
      DECLARE
        connectorIdVal integer;
        tenantPartnerIdVal integer;
        tenantIdVal integer;
        updatedAtVal timestamptz;
        notificationData jsonb;
        tenantData jsonb;
        tariffIds jsonb;
        eventOp text;
        isPartnerLocation boolean := false;
      BEGIN
        IF TG_OP = 'DELETE' THEN
          connectorIdVal := OLD."connectorId";
          tenantPartnerIdVal := OLD."tenantPartnerId";
          tenantIdVal := OLD."tenantId";
          updatedAtVal := NOW();
        ELSE
          connectorIdVal := NEW."connectorId";
          tenantPartnerIdVal := NEW."tenantPartnerId";
          tenantIdVal := NEW."tenantId";
          updatedAtVal := NEW."updatedAt";
        END IF;

        -- Only own (outbound) connector-tariff links
        IF tenantPartnerIdVal IS NOT NULL THEN
          RETURN COALESCE(NEW, OLD);
        END IF;

        -- Skip connectors on partner-owned locations
        SELECT EXISTS (
          SELECT 1
          FROM "Connectors" c
          JOIN "ChargingStations" cs ON cs."id" = c."stationId"
          JOIN "Locations" l ON l."id" = cs."locationId"
          WHERE c."id" = connectorIdVal
            AND l."ownerTenantPartnerId" IS NOT NULL
        ) INTO isPartnerLocation;

        IF isPartnerLocation THEN
          RETURN COALESCE(NEW, OLD);
        END IF;

        eventOp := TG_OP;

        -- Full current tariff list for this connector (after INSERT/UPDATE/DELETE)
        SELECT COALESCE(
          jsonb_agg(ct."tariffOcpiId" ORDER BY ct."tariffOcpiId"),
          '[]'::jsonb
        )
        INTO tariffIds
        FROM "ConnectorTariffs" ct
        WHERE ct."connectorId" = connectorIdVal
          AND ct."tenantPartnerId" IS NULL;

        notificationData := jsonb_build_object(
          'connectorId', connectorIdVal,
          'tenantId', tenantIdVal,
          'tenantPartnerId', tenantPartnerIdVal,
          'tariff_ids', tariffIds,
          'updatedAt', updatedAtVal
        );

        SELECT row_to_json(t) INTO tenantData
        FROM (SELECT * FROM "Tenants" WHERE "id" = tenantIdVal) t;

        IF tenantData IS NOT NULL THEN
          notificationData := notificationData || jsonb_build_object('tenant', tenantData);
        END IF;

        PERFORM pg_notify(
          'ConnectorTariffNotification',
          json_build_object(
            'operation', eventOp,
            'data', notificationData
          )::text
        );

        RETURN COALESCE(NEW, OLD);
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryInterface.sequelize.query(`
      CREATE TRIGGER "ConnectorTariffNotification"
      AFTER INSERT OR UPDATE OR DELETE ON "ConnectorTariffs"
      FOR EACH ROW
      EXECUTE FUNCTION "ConnectorTariffNotify"();
    `);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.sequelize.query(`
      DROP TRIGGER IF EXISTS "ConnectorTariffNotification" ON "ConnectorTariffs";
    `);

    await queryInterface.sequelize.query(`
      DROP FUNCTION IF EXISTS "ConnectorTariffNotify"();
    `);
  },
};
