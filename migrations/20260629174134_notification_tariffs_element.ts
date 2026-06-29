// SPDX-FileCopyrightText: 2026 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

'use strict';

import type { QueryInterface } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface) => {
    // Shared notify function: Tariffs row changes + TariffElements child changes
    await queryInterface.sequelize.query(`
        CREATE OR REPLACE FUNCTION "TariffNotify"()
        RETURNS trigger AS $$
        DECLARE
          requiredFields text[] := ARRAY['id', 'tenantId', 'tenantPartnerId', 'updatedAt'];
          requiredData jsonb;
          changedData jsonb;
          notificationData jsonb;
          tenantData jsonb;
          tenantId integer;
          tariffId integer;
          eventOp text;
        BEGIN
          IF TG_TABLE_NAME = 'TariffElements' THEN
            IF TG_OP = 'DELETE' THEN
              tariffId := OLD."tariffId";
            ELSE
              tariffId := NEW."tariffId";
            END IF;
  
            SELECT
              t."tenantId",
              jsonb_build_object(
                'id', t.id,
                'tenantId', t."tenantId",
                'tenantPartnerId', t."tenantPartnerId",
                'updatedAt', t."updatedAt"
              )
            INTO tenantId, notificationData
            FROM "Tariffs" t
            WHERE t.id = tariffId;
  
            IF notificationData IS NULL THEN
              RETURN COALESCE(NEW, OLD);
            END IF;
  
            IF (notificationData->>'tenantPartnerId') IS NOT NULL THEN
              RETURN COALESCE(NEW, OLD);
            END IF;
  
            eventOp := 'UPDATE';
  
          ELSIF TG_TABLE_NAME = 'Tariffs' THEN
            eventOp := TG_OP;
  
            IF TG_OP = 'INSERT' THEN
              notificationData := to_jsonb(NEW);
              tenantId := NEW."tenantId";
  
            ELSIF TG_OP = 'UPDATE' THEN
              SELECT jsonb_object_agg(key, value) INTO requiredData
              FROM jsonb_each(to_jsonb(NEW))
              WHERE key = ANY(requiredFields);
  
              SELECT jsonb_object_agg(n.key, n.value) INTO changedData
              FROM jsonb_each(to_jsonb(NEW)) n
              JOIN jsonb_each(to_jsonb(OLD)) o ON n.key = o.key
              WHERE n.value IS DISTINCT FROM o.value
              AND n.key != ALL(requiredFields);
  
              IF changedData IS NULL OR changedData = '{}'::jsonb THEN
                RETURN COALESCE(NEW, OLD);
              END IF;
  
              notificationData := requiredData || COALESCE(changedData, '{}'::jsonb);
              tenantId := NEW."tenantId";
  
            ELSIF TG_OP = 'DELETE' THEN
              SELECT jsonb_object_agg(key, value) INTO notificationData
              FROM jsonb_each(to_jsonb(OLD))
              WHERE key = ANY(requiredFields);
              tenantId := OLD."tenantId";
            END IF;
          END IF;
  
          SELECT row_to_json(t) INTO tenantData FROM (
            SELECT * FROM "Tenants" WHERE "id" = tenantId
          ) t;
  
          IF tenantData IS NOT NULL THEN
            notificationData := notificationData || jsonb_build_object('tenant', tenantData);
          END IF;
  
          PERFORM pg_notify(
            'TariffNotification',
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
      CREATE TRIGGER "TariffElementNotification"
      AFTER INSERT OR UPDATE OR DELETE ON "TariffElements"
      FOR EACH ROW
      EXECUTE FUNCTION "TariffNotify"();
    `);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.sequelize.query(`
      DROP TRIGGER IF EXISTS "TariffElementNotification" ON "TariffElements";
    `);

    // Restore TariffNotify to Tariffs-only version (from 20250730123503_notification_tariff.ts)
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION "TariffNotify"()
      RETURNS trigger AS $$
      DECLARE
        requiredFields text[] := ARRAY['id', 'tenantId', 'tenantPartnerId', 'updatedAt'];
        requiredData jsonb;
        changedData jsonb;
        notificationData jsonb;
        tenantData jsonb;
        tenantId integer;
      BEGIN
        IF TG_OP = 'INSERT' THEN
          notificationData := to_jsonb(NEW);
          tenantId := NEW."tenantId";
        ELSIF TG_OP = 'UPDATE' THEN
          SELECT jsonb_object_agg(key, value) INTO requiredData
          FROM jsonb_each(to_jsonb(NEW))
          WHERE key = ANY(requiredFields);

          SELECT jsonb_object_agg(n.key, n.value) INTO changedData
          FROM jsonb_each(to_jsonb(NEW)) n
          JOIN jsonb_each(to_jsonb(OLD)) o ON n.key = o.key
          WHERE n.value IS DISTINCT FROM o.value
          AND n.key != ALL(requiredFields);

          IF changedData IS NULL OR changedData = '{}'::jsonb THEN
            RETURN COALESCE(NEW, OLD);
          END IF;

          notificationData := requiredData || COALESCE(changedData, '{}'::jsonb);
          tenantId := NEW."tenantId";
        ELSIF TG_OP = 'DELETE' THEN
          SELECT jsonb_object_agg(key, value) INTO notificationData
          FROM jsonb_each(to_jsonb(OLD))
          WHERE key = ANY(requiredFields);
          tenantId := OLD."tenantId";
        END IF;

        SELECT row_to_json(t) INTO tenantData FROM (
          SELECT * FROM "Tenants" WHERE "id" = tenantId
        ) t;

        IF tenantData IS NOT NULL THEN
          notificationData := notificationData || jsonb_build_object('tenant', tenantData);
        END IF;

        PERFORM pg_notify(
          'TariffNotification',
          json_build_object(
            'operation', TG_OP,
            'data', notificationData
          )::text
        );

        RETURN COALESCE(NEW, OLD);
      END;
      $$ LANGUAGE plpgsql;
    `);
  },
};