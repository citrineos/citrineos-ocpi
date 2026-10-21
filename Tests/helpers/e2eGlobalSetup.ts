// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

/**
 * Vitest globalSetup for the Tests/reference suites (vitest.e2e.config.ts).
 *
 * Those suites talk to a running OCPI server over HTTP, so on top of startOcpiTestStack
 * (Postgres migrated by the core image + this repo's triggers + Hasura) this boots:
 *   - the seeders/ data the suites assume (tenant FR/ZET, partners FR/CPO and hub FR/107,
 *     roaming FR/CPO + FR/BTU under the hub),
 *   - RabbitMQ: the DtoRouter's RabbitMqDtoSender connects at startup, no broker = no server,
 *   - the built server (Server/dist/index.js) as a child process.
 *
 * Runs once, before any worker starts: workers inherit the OCPI_BASE / HASURA_* env set here.
 */
import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { createWriteStream, readFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { GenericContainer, Wait } from 'testcontainers';
import type { StartedTestContainer } from 'testcontainers';
import type { Sequelize } from 'sequelize-typescript';
import { startOcpiTestStack } from './setupOcpiTestStack.js';
import type { OcpiTestStack } from './setupOcpiTestStack.js';
import testImages from './testImages.json' with { type: 'json' };

const REPO_ROOT = new URL('../../', import.meta.url).pathname;
const SERVER_LOG = `${REPO_ROOT}e2e-server.log`;
// Not guest/guest: RabbitMQ only lets `guest` in from loopback, and a port-mapped
// connection arrives from the docker bridge.
const AMQP_USER = 'e2e';
const AMQP_PASSWORD = 'e2e';

// Identities only. 20250822120003-basic-objects.ts (demo station cp001, DEADBEEF token...)
// is not used by any suite, and no longer applies on the current core schema
// (Tariffs_own_tariff_requires_start_date, unique Tariffs.stationId).
const SEEDERS = [
  '20250806120001-default-tenant.ts',
  '20250806120002-default-tenant-partner.ts',
  '20260803171237-default-roaming-partner.ts',
];

async function applySeeders(sequelize: Sequelize): Promise<void> {
  const dir = `${REPO_ROOT}seeders/`;
  const qi = sequelize.getQueryInterface();
  for (const file of SEEDERS) {
    const mod: any = await import(`${dir}${file}`);
    try {
      await (mod.default ?? mod).up(qi, sequelize);
    } catch (err: any) {
      // Sequelize's "Validation error" hides the useful part in the pg error.
      const pg = err.parent ?? err.original;
      const detail = [pg?.table, pg?.constraint, pg?.detail]
        .filter(Boolean)
        .join(' | ');
      throw new Error(
        `seeder ${file} failed: ${err.message}${detail ? ` (${detail})` : ''}`,
      );
    }
  }

  // Seeders insert explicit ids (Tenants 1, TenantPartners 1-3, Locations 1, ...) without
  // touching the sequences, so the first Hasura insert would collide on id 1.
  await sequelize.query(`
    DO $$
    DECLARE r record;
    BEGIN
      FOR r IN
        SELECT table_name, pg_get_serial_sequence(format('%I', table_name), 'id') AS seq
        FROM information_schema.columns
        WHERE table_schema = 'public' AND column_name = 'id'
      LOOP
        IF r.seq IS NOT NULL THEN
          EXECUTE format(
            'SELECT setval(%L, COALESCE((SELECT MAX(id) FROM %I), 0) + 1, false)',
            r.seq, r.table_name);
        END IF;
      END LOOP;
    END $$;
  `);
}

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.once('error', reject);
    srv.listen(0, () => {
      const { port } = srv.address() as { port: number };
      srv.close(() => resolve(port));
    });
  });
}

function serverLogTail(lines = 80): string {
  try {
    return readFileSync(SERVER_LOG, 'utf-8')
      .split('\n')
      .slice(-lines)
      .join('\n');
  } catch {
    return '(no server log)';
  }
}

async function waitForServer(
  server: ChildProcess,
  ocpiBase: string,
  timeoutMs: number,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(
        `OCPI server exited with code ${server.exitCode} before listening.\n` +
          `--- ${SERVER_LOG} ---\n${serverLogTail()}`,
      );
    }
    try {
      // Unauthenticated: any HTTP answer (401 included) means routes are mounted.
      await fetch(`${ocpiBase}/versions/1`);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 1_000));
    }
  }
  throw new Error(
    `OCPI server not listening after ${timeoutMs / 1000}s.\n` +
      `--- ${SERVER_LOG} ---\n${serverLogTail()}`,
  );
}

export default async function setup(): Promise<() => Promise<void>> {
  let stack: OcpiTestStack | undefined;
  let rabbit: StartedTestContainer | undefined;
  let server: ChildProcess | undefined;

  const teardown = async () => {
    if (server && server.exitCode === null) {
      const exited = new Promise((r) => server!.once('exit', r));
      server.kill('SIGTERM');
      await Promise.race([exited, new Promise((r) => setTimeout(r, 10_000))]);
      server.kill('SIGKILL');
    }
    await rabbit?.stop();
    await stack?.stop();
  };

  try {
    stack = await startOcpiTestStack();
    await applySeeders(stack.sequelize);

    rabbit = await new GenericContainer(testImages.rabbitmq)
      .withExposedPorts(5672)
      .withEnvironment({
        RABBITMQ_DEFAULT_USER: AMQP_USER,
        RABBITMQ_DEFAULT_PASS: AMQP_PASSWORD,
      })
      .withWaitStrategy(Wait.forLogMessage(/Server startup complete/))
      .withStartupTimeout(120_000)
      .start();

    const pg = new URL(stack.pgConnectionString);
    const port = await freePort();
    const ocpiBase = `http://127.0.0.1:${port}/ocpi`;

    const log = createWriteStream(SERVER_LOG);
    server = spawn(process.execPath, ['dist/index.js'], {
      cwd: `${REPO_ROOT}Server`,
      env: {
        ...process.env,
        APP_NAME: 'all',
        APP_ENV: 'docker', // Server/src/config/envs/docker.ts: reads the vars below
        DB_HOST: pg.hostname,
        DB_PORT: pg.port,
        DB_NAME: pg.pathname.slice(1),
        DB_USER: pg.username,
        DB_PASS: pg.password,
        GRAPHQL_ENDPOINT: stack.graphqlEndpoint,
        AMQP_URL: `amqp://${AMQP_USER}:${AMQP_PASSWORD}@${rabbit.getHost()}:${rabbit.getMappedPort(5672)}`,
        AMQP_EXCHANGE: 'ocpi',
        // No plain env var for these in docker.ts; the CITRINEOS_OCPI_ prefix overrides
        // any config path (00_Base/src/config/defineOcpiConfig.ts).
        CITRINEOS_OCPI_GRAPHQL_HEADERS: JSON.stringify(stack.graphqlHeaders),
        CITRINEOS_OCPI_OCPISERVER_PORT: String(port),
        // The seeded hub is Gireve's preprod identity, so isGirevePartner() is true for
        // it and the Gireve-specific branches (PATCH->PUT, retry outbox) actually run.
        CITRINEOS_OCPI_GIREVE_COUNTRYCODE: 'FR',
        CITRINEOS_OCPI_GIREVE_PARTYID: '107',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    server.stdout!.pipe(log);
    server.stderr!.pipe(log);

    await waitForServer(server, ocpiBase, 120_000);

    process.env.OCPI_BASE = ocpiBase;
    process.env.HASURA_URL = stack.graphqlEndpoint;
    process.env.HASURA_ADMIN_SECRET =
      stack.graphqlHeaders['x-hasura-admin-secret'];
  } catch (err) {
    await teardown();
    throw err;
  }

  return teardown;
}
