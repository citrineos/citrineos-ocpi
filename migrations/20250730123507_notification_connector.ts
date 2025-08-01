'use strict';

import { QueryInterface } from 'sequelize';

export = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION "ConnectorNotify"()
      RETURNS trigger AS $$
      DECLARE
        stationData jsonb;
        requiredFields text[] := ARRAY['id', 'tenantId', 'updatedAt', 'stationId'];
        requiredData jsonb;
        changedData jsonb;
        notificationData jsonb;
      BEGIN
        IF TG_OP = 'INSERT' THEN
          -- For INSERT: include all fields
          notificationData := to_jsonb(NEW);

        ELSIF TG_OP = 'UPDATE' THEN
          -- For UPDATE: required fields + changed fields
          SELECT jsonb_object_agg(key, value) INTO requiredData
          FROM jsonb_each(to_jsonb(NEW))
          WHERE key = ANY(requiredFields);

          SELECT jsonb_object_agg(key, n.value) INTO changedData
          FROM jsonb_each(to_jsonb(NEW)) n
          JOIN jsonb_each(to_jsonb(OLD)) o ON n.key = o.key
          WHERE n.value IS DISTINCT FROM o.value
          AND key != ALL(requiredFields);

          notificationData := requiredData || COALESCE(changedData, '{}'::jsonb);
        END IF;

        PERFORM pg_notify(
          'ConnectorNotification',
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
      CREATE TRIGGER "ConnectorNotification"
      AFTER INSERT OR UPDATE ON "Connectors"
      FOR EACH ROW
      EXECUTE FUNCTION "ConnectorNotify"();
    `);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.sequelize.query(`
      DROP TRIGGER IF EXISTS "ConnectorNotification" ON "Connectors";
    `);

    await queryInterface.sequelize.query(`
      DROP FUNCTION IF EXISTS "ConnectorNotify"();
    `);
  },
};
