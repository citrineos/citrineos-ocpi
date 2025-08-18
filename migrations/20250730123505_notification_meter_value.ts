'use strict';

import { QueryInterface } from 'sequelize';

export = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION "MeterValueNotify"()
      RETURNS trigger AS $$
      DECLARE
        notificationData jsonb;
        transactionId text;
        tenantData jsonb;
      BEGIN
        IF TG_OP = 'INSERT' AND NEW."transactionDatabaseId" IS NOT NULL THEN
          -- Get transactionId and tenantId from Transactions
          SELECT t."transactionId", to_jsonb(tenant) INTO transactionId, tenantData
          FROM "Transactions" t
          JOIN "Tenants" tenant ON tenant."id" = t."tenantId"
          WHERE t."id" = NEW."transactionDatabaseId";

          -- Merge all MeterValues fields, transactionId, and tenant
          notificationData := to_jsonb(NEW)
            || jsonb_build_object('transactionId', transactionId)
            || jsonb_build_object('tenant', tenantData);
        END IF;

        PERFORM pg_notify(
          'MeterValueNotification',
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
      CREATE TRIGGER "MeterValueNotification"
      AFTER INSERT ON "MeterValues"
      FOR EACH ROW
      EXECUTE FUNCTION "MeterValueNotify"();
    `);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.sequelize.query(`
      DROP TRIGGER IF EXISTS "MeterValueNotification" ON "MeterValues";
    `);

    await queryInterface.sequelize.query(`
      DROP FUNCTION IF EXISTS "MeterValueNotify"();
    `);
  },
};
