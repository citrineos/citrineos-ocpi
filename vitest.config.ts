// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

/**
 * Integration suites only. The unit suites stay on ts-jest (jest.config.cjs) — they
 * mock the ESM workspace packages away, so CJS costs them nothing.
 *
 * These suites can't: they need the REAL @zetra/citrineos-data models to build the
 * test schema, and citrineos-core ships pre-built ESM dist. Same reason
 * citrineos-core runs its own testcontainers suite under vitest.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/*.integration.test.ts'],
    // Container boot (~30-45s for pg + Hasura metadata apply) is not test work.
    testTimeout: 180_000,
    hookTimeout: 420_000,
    // Suites share fixed network aliases and TRUNCATE the same tables, so they must
    // not interleave. Drop this once each suite owns its own stack.
    fileParallelism: false,
  },
});
