'use strict';

import { QueryInterface } from 'sequelize';

export = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION "TransactionNotify"()
      RETURNS trigger AS $$
      DECLARE
        requiredFields text[] := ARRAY['id', 'tenantId', 'updatedAt'];
        requiredData jsonb;
        changedData jsonb;
        notificationData jsonb;
      BEGIN
        IF TG_OP = 'INSERT' THEN
          -- For INSERT: include all fields
          notificationData := to_jsonb(NEW);

        ELSIF TG_OP = 'UPDATE' THEN
          -- Start with required fields
          SELECT jsonb_object_agg(key, value) INTO requiredData
          FROM jsonb_each(to_jsonb(NEW))
          WHERE key = ANY(requiredFields);

          -- Add changed fields
          SELECT jsonb_object_agg(key, n.value) INTO changedData
          FROM jsonb_each(to_jsonb(NEW)) n
          JOIN jsonb_each(to_jsonb(OLD)) o ON n.key = o.key
          WHERE n.value IS DISTINCT FROM o.value
          AND n.key != ALL(requiredFields); -- Don't duplicate required fields

          -- Merge required and changed fields
          notificationData := requiredData || COALESCE(changedData, '{}'::jsonb);
        END IF;

        PERFORM pg_notify(
          'TransactionNotification',
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
      CREATE TRIGGER "TransactionNotification"
      AFTER INSERT OR UPDATE ON "Transactions"
      FOR EACH ROW
      EXECUTE FUNCTION "TransactionNotify"();
    `);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.sequelize.query(`
      DROP TRIGGER IF EXISTS "TransactionNotification" ON "Transactions";
    `);

    await queryInterface.sequelize.query(`
      DROP FUNCTION IF EXISTS "TransactionNotify"();
    `);
  },
};
