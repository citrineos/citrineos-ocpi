import { Views } from './views';

export const createViewTransactionsWithPartyIdAndCountryCodeSql = `
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_views WHERE viewname = '${Views.ViewTransactionsWithPartyIdAndCountryCodes}') THEN
        EXECUTE '
        CREATE VIEW "${Views.ViewTransactionsWithPartyIdAndCountryCodes}" AS
        SELECT
            "Transactions".*,
            "OcpiLocations".country_code AS "country_code",
            "OcpiLocations".party_id AS "party_id"
        FROM "Transactions"
        JOIN "ChargingStations" ON "Transactions"."stationId" = "ChargingStations"."id"
        JOIN "OcpiLocations" ON "ChargingStations"."locationId" = "OcpiLocations"."id";
        ';
    END IF;
END $$;
`;

export const dropViewTransactionsWithPartyIdAndCountryCodeSql = `
  DROP VIEW IF EXISTS ${Views.ViewTransactionsWithPartyIdAndCountryCodes};
`;
