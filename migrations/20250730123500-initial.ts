'use strict';

import { QueryInterface } from 'sequelize';

export = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_Authorizations_realTimeAuth') THEN
          CREATE TYPE "enum_Authorizations_realTimeAuth" AS ENUM ('Never', 'Allowed', 'AllowedOffline');
        END IF;
      END $$;

      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_ClientCredentialsRoles_role') THEN
          CREATE TYPE "enum_ClientCredentialsRoles_role" AS ENUM ('EMSP');
        END IF;
      END $$;

      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_ServerCredentialsRoles_role') THEN
          CREATE TYPE "enum_ServerCredentialsRoles_role" AS ENUM ('CPO');
        END IF;
      END $$;

      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_Images_category') THEN
          CREATE TYPE "enum_Images_category" AS ENUM ('CHARGER', 'ENTRANCE', 'LOCATION', 'NETWORK', 'OPERATOR', 'OTHER', 'OWNER');
        END IF;
      END $$;

      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_Images_type') THEN
          CREATE TYPE "enum_Images_type" AS ENUM ('jpeg', 'jpg', 'png');
        END IF;
      END $$;

      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_ClientVersions_version') THEN
          CREATE TYPE "enum_ClientVersions_version" AS ENUM ('2.0', '2.1', '2.1.1', '2.2', '2.2.1');
        END IF;
      END $$;

      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_ServerVersions_version') THEN
          CREATE TYPE "enum_ServerVersions_version" AS ENUM ('2.0', '2.1', '2.1.1', '2.2', '2.2.1');
        END IF;
      END $$;

      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_Versions_version') THEN
          CREATE TYPE "enum_Versions_version" AS ENUM ('2.0', '2.1', '2.1.1', '2.2', '2.2.1');
        END IF;
      END $$;

      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_OcpiReservations_countryCode') THEN
          CREATE TYPE "enum_OcpiReservations_countryCode" AS ENUM ('US', 'CA', 'MX');
        END IF;
      END $$;

      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_AsyncJobStatuses_jobName') THEN
          CREATE TYPE "enum_AsyncJobStatuses_jobName" AS ENUM ('FETCH_OCPI_TOKENS');
        END IF;
      END $$;

      CREATE TABLE IF NOT EXISTS "CpoTenants"
      (
          id          serial
              primary key,
          "createdAt" timestamp with time zone not null,
          "updatedAt" timestamp with time zone not null
      );
      
      CREATE TABLE IF NOT EXISTS "ClientInformations"
      (
          id            serial
              primary key,
          "clientToken" varchar(255)
              unique,
          "serverToken" varchar(255)
              unique,
          registered    boolean,
          "cpoTenantId" integer
              references "CpoTenants"
                  on update cascade,
          "createdAt"   timestamp with time zone not null,
          "updatedAt"   timestamp with time zone not null
      );
      
      CREATE TABLE IF NOT EXISTS "ClientCredentialsRoles"
      (
          id                    serial
              primary key,
          role                  "enum_ClientCredentialsRoles_role",
          party_id              varchar(3),
          country_code          varchar(2),
          "clientInformationId" integer
              references "ClientInformations"
                  on update cascade on delete cascade,
          "cpoTenantId"         integer
              references "CpoTenants"
                  on update cascade,
          "createdAt"           timestamp with time zone not null,
          "updatedAt"           timestamp with time zone not null
      );
      
      CREATE TABLE IF NOT EXISTS "ServerCredentialsRoles"
      (
          id            serial
              primary key,
          role          "enum_ServerCredentialsRoles_role",
          party_id      varchar(3),
          country_code  varchar(2),
          "cpoTenantId" integer
              references "CpoTenants"
                  on update cascade on delete cascade,
          "createdAt"   timestamp with time zone not null,
          "updatedAt"   timestamp with time zone not null
      );
      
      create unique index if not exists server_credentials_roles_country_code_party_id
          on "ServerCredentialsRoles" (country_code, party_id);
      
      CREATE TABLE IF NOT EXISTS "BusinessDetails"
      (
          id                        serial
              primary key,
          name                      varchar(100),
          website                   varchar(255),
          "clientCredentialsRoleId" integer
              references "ClientCredentialsRoles"
                  on update cascade on delete cascade,
          "serverCredentialsRoleId" integer
              references "ServerCredentialsRoles"
                  on update cascade on delete cascade,
          "createdAt"               timestamp with time zone not null,
          "updatedAt"               timestamp with time zone not null
      );
      
      CREATE TABLE IF NOT EXISTS "Images"
      (
          id                  serial
              primary key,
          url                 varchar(255),
          thumbnail           varchar(255),
          category            "enum_Images_category",
          type                "enum_Images_type",
          width               integer,
          height              integer,
          "businessDetailsId" integer
              references "BusinessDetails"
                  on update cascade on delete cascade,
          "createdAt"         timestamp with time zone not null,
          "updatedAt"         timestamp with time zone not null
      );
      
      CREATE TABLE IF NOT EXISTS "ClientVersions"
      (
          id                    serial
              primary key,
          version               "enum_ClientVersions_version",
          url                   varchar(255),
          "clientInformationId" integer
              references "ClientInformations"
                  on update cascade on delete cascade,
          "createdAt"           timestamp with time zone not null,
          "updatedAt"           timestamp with time zone not null
      );
      
      CREATE TABLE IF NOT EXISTS "ServerVersions"
      (
          id                    serial
              primary key,
          version               "enum_ServerVersions_version",
          url                   varchar(255),
          "clientInformationId" integer
              references "ClientInformations"
                  on update cascade on delete cascade,
          "createdAt"           timestamp with time zone not null,
          "updatedAt"           timestamp with time zone not null
      );
      
      CREATE TABLE IF NOT EXISTS "Endpoints"
      (
          id                serial
              primary key,
          identifier        varchar(255),
          role              varchar(255),
          url               varchar(255),
          "clientVersionId" integer
              references "ClientVersions"
                  on update cascade on delete cascade,
          "serverVersionId" integer
              references "ServerVersions"
                  on update cascade on delete cascade,
          "createdAt"       timestamp with time zone not null,
          "updatedAt"       timestamp with time zone not null
      );
      
      CREATE TABLE IF NOT EXISTS "Versions"
      (
          id          serial
              primary key,
          version     "enum_Versions_version",
          url         varchar(255),
          "createdAt" timestamp with time zone not null,
          "updatedAt" timestamp with time zone not null
      );
      
      CREATE TABLE IF NOT EXISTS "VersionEndpoints"
      (
          id          serial
              primary key,
          identifier  varchar(255),
          role        varchar(255),
          url         varchar(255),
          "versionId" integer
              references "Versions"
                  on update cascade on delete cascade,
          "createdAt" timestamp with time zone not null,
          "updatedAt" timestamp with time zone not null
      );
      
      CREATE TABLE IF NOT EXISTS "OcpiLocations"
      (
          id               serial
              primary key,
          "coreLocationId" integer
              unique,
          publish          boolean,
          "lastUpdated"    timestamp with time zone,
          "partyId"        varchar(3),
          "countryCode"    varchar(2),
          "timeZone"       varchar(255),
          "createdAt"      timestamp with time zone not null,
          "updatedAt"      timestamp with time zone not null
      );
      
      CREATE TABLE IF NOT EXISTS "OcpiEvses"
      (
          id                  serial
              primary key,
          "evseId"            integer,
          "stationId"         varchar(255),
          "physicalReference" varchar(255),
          removed             boolean,
          "lastUpdated"       timestamp with time zone,
          "createdAt"         timestamp with time zone not null,
          "updatedAt"         timestamp with time zone not null,
          unique ("evseId", "stationId")
      );
      
      CREATE TABLE IF NOT EXISTS "OcpiConnectors"
      (
          id            serial
              primary key,
          "connectorId" integer,
          "evseId"      integer,
          "stationId"   varchar(255),
          "lastUpdated" timestamp with time zone,
          "createdAt"   timestamp with time zone not null,
          "updatedAt"   timestamp with time zone not null,
          unique ("connectorId", "evseId", "stationId")
      );
      
      CREATE TABLE IF NOT EXISTS "OcpiReservations"
      (
          id                       serial
              primary key,
          "coreReservationId"      integer
              unique
              references "Reservations"
                  on update cascade,
          "locationId"             integer
              references "OcpiLocations"
                  on update cascade,
          "reservationId"          varchar(255),
          "countryCode"            "enum_OcpiReservations_countryCode",
          "partyId"                varchar(255),
          "evseUid"                varchar(255),
          "authorizationReference" varchar(255),
          "createdAt"              timestamp with time zone not null,
          "updatedAt"              timestamp with time zone not null,
          unique ("reservationId", "countryCode", "partyId")
      );
      
      CREATE TABLE IF NOT EXISTS "ResponseUrlCorrelationIds"
      (
          id              serial
              primary key,
          "correlationId" varchar(255)
              unique,
          "responseUrl"   varchar(255),
          params          json,
          "createdAt"     timestamp with time zone not null,
          "updatedAt"     timestamp with time zone not null
      );
      
      create index if not exists response_url_correlation_ids_correlation_id
          on "ResponseUrlCorrelationIds" ("correlationId");
      
      CREATE TABLE IF NOT EXISTS "OcpiTariffs"
      (
          id              serial
              primary key,
          "countryCode"   char(2),
          "partyId"       varchar(3),
          "coreTariffId"  integer
              unique,
          "tariffAltText" json,
          "createdAt"     timestamp with time zone not null,
          "updatedAt"     timestamp with time zone not null
      );
      
      create index if not exists ocpi_tariffs_core_tariff_id
          on "OcpiTariffs" ("coreTariffId");
      
      CREATE TABLE IF NOT EXISTS "SessionChargingProfiles"
      (
          id                   serial
              primary key,
          "sessionId"          varchar(255)
              unique,
          "chargingProfileId"  integer,
          "chargingScheduleId" integer,
          "createdAt"          timestamp with time zone not null,
          "updatedAt"          timestamp with time zone not null
      );
      
      create index if not exists session_charging_profiles_session_id
          on "SessionChargingProfiles" ("sessionId");
      
      CREATE TABLE IF NOT EXISTS "OcpiTokens"
      (
          id                   serial
              primary key,
          authorization_id     integer
              unique
              references "Authorizations"
                  on update cascade,
          country_code         varchar(255),
          party_id             varchar(255),
          type                 varchar(255),
          visual_number        varchar(255),
          issuer               varchar(255),
          whitelist            varchar(255),
          default_profile_type varchar(255),
          energy_contract      json,
          last_updated         timestamp with time zone,
          "createdAt"          timestamp with time zone not null,
          "updatedAt"          timestamp with time zone not null
      );
      
      CREATE TABLE IF NOT EXISTS "AsyncJobStatuses"
      (
          "jobId"            varchar(255)             not null
              primary key,
          "jobName"          "enum_AsyncJobStatuses_jobName",
          "mspCountryCode"   varchar(255),
          "mspPartyId"       varchar(255),
          "cpoCountryCode"   varchar(255),
          "cpoPartyId"       varchar(255),
          "finishedAt"       timestamp with time zone,
          "stoppedAt"        timestamp with time zone,
          "stopScheduled"    boolean,
          "isFailed"         boolean,
          "paginationParams" json,
          "totalObjects"     integer,
          "createdAt"        timestamp with time zone not null,
          "updatedAt"        timestamp with time zone not null
      );
    `);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.sequelize.query(`
        DROP TABLE IF EXISTS "AsyncJobStatuses";
        DROP TABLE IF EXISTS "OcpiTokens";
        DROP TABLE IF EXISTS "SessionChargingProfiles";
        DROP TABLE IF EXISTS "OcpiTariffs";
        DROP TABLE IF EXISTS "ResponseUrlCorrelationIds";
        DROP TABLE IF EXISTS "OcpiReservations";
        DROP TABLE IF EXISTS "OcpiConnectors";
        DROP TABLE IF EXISTS "OcpiEvses";
        DROP TABLE IF EXISTS "OcpiLocations";
        DROP TABLE IF EXISTS "VersionEndpoints";
        DROP TABLE IF EXISTS "Versions";
        DROP TABLE IF EXISTS "Endpoints";
        DROP TABLE IF EXISTS "ServerVersions";
        DROP TABLE IF EXISTS "ClientVersions";
        DROP TABLE IF EXISTS "Images";
        DROP TABLE IF EXISTS "BusinessDetails";
        DROP TABLE IF EXISTS "ServerCredentialsRoles";
        DROP TABLE IF EXISTS "ClientCredentialsRoles";
        DROP TABLE IF EXISTS "ClientInformations";
        DROP TABLE IF EXISTS "CpoTenants";

        DROP TYPE IF EXISTS "enum_AsyncJobStatuses_jobName";
        DROP TYPE IF EXISTS "enum_OcpiReservations_countryCode";
        DROP TYPE IF EXISTS "enum_Versions_version";
        DROP TYPE IF EXISTS "enum_ServerVersions_version";
        DROP TYPE IF EXISTS "enum_ClientVersions_version";
        DROP TYPE IF EXISTS "enum_Images_type";
        DROP TYPE IF EXISTS "enum_Images_category";
        DROP TYPE IF EXISTS "enum_ServerCredentialsRoles_role";
        DROP TYPE IF EXISTS "enum_ClientCredentialsRoles_role";
        DROP TYPE IF EXISTS "enum_Authorizations_realTimeAuth";
    `);
  },
};
