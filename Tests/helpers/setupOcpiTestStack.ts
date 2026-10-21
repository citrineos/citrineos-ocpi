// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

/**
 * Real Postgres + real Hasura, per test run.
 *
 * Why both: the OCPI receiver services never touch Postgres directly — they issue
 * GraphQL against Hasura (see LocationReceiverService's OcpiGraphqlClient). A bare
 * Postgres leaves every mutation without a resolver, so the DB half alone proves nothing.
 *
 * Why the schema comes from citrineos-core's IMAGE and not from its models:
 *   - `sync({force:true})` builds from model classes, which lag the migrations. Evses.directions
 *     is added by migrations/20260330102132-evse-fields-ocpi.ts; a models-only schema omits it
 *     and correct queries fail with "field 'directions' not found in type: 'Evses'".
 *   - Migrations also do work models cannot express: FK constraints via raw SQL, CREATE TYPE,
 *     the citext column conversion, named unique indexes. Hasura's metadata depends on those
 *     FK constraints existing (public_Transactions.yaml -> foreign_key_constraint_on).
 *   - Hand-replaying the .ts files does not work either: several migrations query the
 *     "SequelizeMeta" ledger to decide whether they already ran. sequelize-cli owns that.
 * So we run the core image's own `npm run migrate` — the exact command entrypoint.sh runs in
 * production. No citrineos-core checkout, no cross-repo token, no model/package coupling.
 */
import { GenericContainer, Network, Wait } from 'testcontainers';
import type { StartedTestContainer, StartedNetwork } from 'testcontainers';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Sequelize } from 'sequelize-typescript';
import testImages from './testImages.json' with { type: 'json' };
import { resolveCoreImage } from './resolveCoreImage.mjs';

const HASURA_IMAGE = process.env.HASURA_TEST_IMAGE ?? testImages.hasura;
const ADMIN_SECRET = 'testsecret';
const PG_ALIAS = 'ocpp-db'; // hostname the other containers use on the shared network
const PG_DB = 'citrine';
const PG_USER = 'citrine';
const PG_PASSWORD = 'citrine';

export interface OcpiTestStack {
  /** No models registered — tests read/write with raw SQL. */
  sequelize: Sequelize;
  pgConnectionString: string;
  graphqlEndpoint: string;
  graphqlHeaders: Record<string, string>;
  /** TRUNCATE the tables a test writes to. Call in beforeEach. */
  cleanup: (tables: string[]) => Promise<void>;
  stop: () => Promise<void>;
}

async function collectLogs(container: StartedTestContainer): Promise<string> {
  const stream = await container.logs();
  let out = '';
  stream.on('data', (line) => (out += line));
  await new Promise<void>((resolve) => {
    stream.on('end', resolve);
    stream.on('error', resolve);
  });
  // Release the underlying docker log socket before the caller calls container.stop():
  // otherwise dockerode's internal demuxer can still be mid-write when stop() tears down
  // the container, throwing an unhandled EPIPE that crashes the whole suite instead of
  // just this container's teardown.
  stream.destroy();
  return out;
}

/**
 * This repo's own migrations, replayed after citrineos-core's image has built the base
 * schema. They are the pg NOTIFY triggers the broadcasters depend on (14 of the 21 files),
 * and they live HERE, not in citrineos-core — so the core image never creates them.
 *
 * Read from the working tree on purpose: a PR that edits a trigger must be tested by that
 * PR, not by whatever was published in the last core image.
 *
 * Safe to call up() directly, unlike core's migrations: none of these read the
 * "SequelizeMeta" ledger and none create tables — they are CREATE OR REPLACE FUNCTION plus
 * CREATE TRIGGER against tables the core migrations already made.
 */
async function applyOcpiMigrations(sequelize: Sequelize): Promise<void> {
  const dir = new URL('../../migrations/', import.meta.url).pathname;
  const { readdirSync } = await import('node:fs');
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.ts'))
    .sort();

  const qi = sequelize.getQueryInterface();
  for (const file of files) {
    const mod: any = await import(`${dir}${file}`);
    try {
      await (mod.default ?? mod).up(qi, sequelize);
    } catch (err: any) {
      throw new Error(`ocpi migration ${file} failed: ${err.message}`);
    }
  }

  // Fail here rather than as a 5s LISTEN timeout in a test 200 lines away.
  const [rows]: any = await sequelize.query(
    `SELECT count(*)::int AS n FROM pg_trigger WHERE NOT tgisinternal`,
  );
  if (rows[0].n === 0) {
    throw new Error('ocpi migrations ran but installed no triggers');
  }
}

export async function startOcpiTestStack(): Promise<OcpiTestStack> {
  const CORE_IMAGE = await resolveCoreImage(testImages.core);
  const network: StartedNetwork = await new Network().start();

  const pg: StartedPostgreSqlContainer = await new PostgreSqlContainer(
    'postgis/postgis:16-3.5',
  )
    .withDatabase(PG_DB)
    .withUsername(PG_USER)
    .withPassword(PG_PASSWORD)
    .withNetwork(network)
    .withNetworkAliases(PG_ALIAS)
    .start();

  const sequelize = new Sequelize({
    dialect: 'postgres',
    host: pg.getHost(),
    port: pg.getPort(),
    database: pg.getDatabase(),
    username: pg.getUsername(),
    password: pg.getPassword(),
    logging: false,
  });

  // postgis for the `coordinates` geometry columns; citext for the idToken column the
  // migrations convert. Idempotent, and cheaper than discovering it mid-migration.
  await sequelize.query('CREATE EXTENSION IF NOT EXISTS citext;');
  await sequelize.query('CREATE EXTENSION IF NOT EXISTS postgis;');

  // One-shot migration container. Runs and exits; nothing stays up.
  const migrator: StartedTestContainer = await new GenericContainer(CORE_IMAGE)
    .withNetwork(network)
    .withEnvironment({
      // bootstrap_citrineos_ prefix, uppercased — core's config/defineConfig.ts:20 builds it,
      // bootstrap.config.ts reads database_host/_port/_name/_dialect/_username/_password.
      BOOTSTRAP_CITRINEOS_DATABASE_HOST: PG_ALIAS, // on the shared network, not the host port
      BOOTSTRAP_CITRINEOS_DATABASE_PORT: '5432',
      BOOTSTRAP_CITRINEOS_DATABASE_NAME: PG_DB,
      BOOTSTRAP_CITRINEOS_DATABASE_DIALECT: 'postgres',
      BOOTSTRAP_CITRINEOS_DATABASE_USERNAME: PG_USER,
      BOOTSTRAP_CITRINEOS_DATABASE_PASSWORD: PG_PASSWORD,
    })
    // Bypass entrypoint.sh: it migrates and then `exec`s the server. We want the migration
    // only, and we need the container to exit so completion is observable.
    .withEntrypoint(['sh', '-c'])
    .withCommand(['npm run migrate'])
    // That exact string is the tail of core's `migrate` script. Prefer
    // Wait.forOneShotStartup() if your testcontainers version has it.
    // .withWaitStrategy(Wait.forLogMessage(/migration completed successfully/))
    // forOneShotStartup is built for containers that run and exit — a non-zero exit fails
    // here instead of passing silently, which forLogMessage did.
    .withWaitStrategy(Wait.forOneShotStartup())
    .withStartupTimeout(300_000)
    .start();

  const migratorOutput = await collectLogs(migrator);
  await migrator.stop();
  await applyOcpiMigrations(sequelize);

  // Fail at the cause, not 30 lines later as `relation "Connectors" does not exist`.
  const [rows]: any = await sequelize.query(
    `SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema = 'public'`,
  );
  if (rows[0].n < 40) {
    throw new Error(
      `Migrations did not run — only ${rows[0].n} tables in public schema.\n` +
        `--- migrator container output ---\n${migratorOutput}`,
    );
  }
  // cli-migrations-v3 applies /hasura-metadata at boot and refuses to become healthy if it
  // is inconsistent with the schema above — which is the signal we want, not a nuisance.
  const hasura: StartedTestContainer = await new GenericContainer(HASURA_IMAGE)
    .withNetwork(network)
    .withExposedPorts(8080)
    .withEnvironment({
      HASURA_GRAPHQL_DATABASE_URL: `postgres://${PG_USER}:${PG_PASSWORD}@${PG_ALIAS}:5432/${PG_DB}`,
      HASURA_GRAPHQL_ADMIN_SECRET: ADMIN_SECRET,
      HASURA_GRAPHQL_ENABLE_CONSOLE: 'false',
      HASURA_GRAPHQL_MIGRATIONS_DIR: '/hasura-migrations',
      HASURA_GRAPHQL_METADATA_DIR: '/hasura-metadata',
    })
    .withWaitStrategy(Wait.forHttp('/healthz', 8080).forStatusCode(200))
    .withStartupTimeout(120_000)
    .start();

  const graphqlEndpoint = `http://${hasura.getHost()}:${hasura.getMappedPort(8080)}/v1/graphql`;

  return {
    sequelize,
    pgConnectionString: `postgres://${PG_USER}:${PG_PASSWORD}@${pg.getHost()}:${pg.getPort()}/${PG_DB}`,
    graphqlEndpoint,
    graphqlHeaders: { 'x-hasura-admin-secret': ADMIN_SECRET },
    cleanup: async (tables: string[]) => {
      if (!tables.length) return;
      const list = tables.map((t) => `"${t}"`).join(', ');
      await sequelize.query(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
    },
    stop: async () => {
      await sequelize.close();
      await hasura.stop();
      await pg.stop();
      await network.stop();
    },
  };
}
