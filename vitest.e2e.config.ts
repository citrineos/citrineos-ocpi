// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

/**
 * End-to-end suites (Tests/reference): real HTTP against the built OCPI server, booted by
 * Tests/helpers/e2eGlobalSetup.ts on top of the same Postgres + Hasura stack as the
 * integration suites. Requires `npm run build` first — the server runs from Server/dist.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['Tests/reference/**/*.test.ts'],
    globalSetup: ['Tests/helpers/e2eGlobalSetup.ts'],
    testTimeout: 30_000,
    // Stack boot: pg + core migrations + Hasura + RabbitMQ + server startup.
    hookTimeout: 600_000,
    // One server, one database: suites assume nobody else is writing.
    fileParallelism: false,
  },
});
