// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

'use strict';

import { QueryInterface } from 'sequelize';

export = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION "ChargingStationNotify"()
      RETURNS trigger AS $$
      DECLARE
        requiredFields text[] := ARRAY['id', 'tenantId', 'updatedAt', 'locationId'];
        requiredData jsonb;
        changedData jsonb;
        notificationData jsonb;
        tenantData jsonb;
        tenantId integer;
      BEGIN
        IF TG_OP = 'UPDATE' THEN
          -- Start with required fields
          SELECT jsonb_object_agg(key, value) INTO requiredData
          FROM jsonb_each(to_jsonb(NEW))
          WHERE key = ANY(requiredFields);

          -- Add changed fields
          SELECT jsonb_object_agg(n.key, n.value) INTO changedData
          FROM jsonb_each(to_jsonb(NEW)) n
          JOIN jsonb_each(to_jsonb(OLD)) o ON n.key = o.key
          WHERE n.value IS DISTINCT FROM o.value
          AND n.key != ALL(requiredFields); -- Don't duplicate required fields

          -- Only proceed if non-required fields changed
          IF changedData IS NULL OR changedData = '{}'::jsonb THEN
            RETURN COALESCE(NEW, OLD);
          END IF;

          -- Merge required and changed fields
          notificationData := requiredData || COALESCE(changedData, '{}'::jsonb);
          tenantId := NEW."tenantId";

        END IF;

        -- Fetch tenant data as JSONB
        SELECT row_to_json(t) INTO tenantData FROM (
          SELECT * FROM "Tenants" WHERE "id" = tenantId
        ) t;

        -- Merge tenant data into notificationData
        IF tenantData IS NOT NULL THEN
          notificationData := notificationData || jsonb_build_object('tenant', tenantData);
        END IF;

        PERFORM pg_notify(
          'ChargingStationNotification',
          json_build_object(
            'operation', TG_OP,
            'data', notificationData
          )::text
        );

        RETURN COALESCE(NEW, OLD);
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryInterface.sequelize.query(`
      CREATE TRIGGER "ChargingStationNotification"
      AFTER UPDATE ON "ChargingStations"
      FOR EACH ROW
      EXECUTE FUNCTION "ChargingStationNotify"();
    `);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.sequelize.query(`
      DROP TRIGGER IF EXISTS "ChargingStationNotification" ON "ChargingStations";
    `);

    await queryInterface.sequelize.query(`
      DROP FUNCTION IF EXISTS "ChargingStationNotify"();
    `);
  },
};
