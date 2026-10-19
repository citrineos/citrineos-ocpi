// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

/** @type {import('ts-jest').JestConfigWithTsJest} */
/* eslint-disable */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFiles: ['reflect-metadata'],
  // Tests/reference holds the old live-stack suites (they drove a running server on :8085).
  // Kept as the spec for porting onto Tests/helpers/setupOcpiTestStack.ts; not runnable as-is.
  testPathIgnorePatterns: [
    '/node_modules/',
    '/Tests/reference/',
    '\\.integration\\.test\\.ts$',
    '/dist/',
  ],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transformIgnorePatterns: ['node_modules/(?!(@citrineos|@zetra)/)'],
  transform: {
    '^.+\\.[tj]sx?$': [
      'ts-jest',
      {
        tsconfig: {
          verbatimModuleSyntax: false,
          module: 'commonjs',
          moduleResolution: 'node',
        },
      },
    ],
  },
};
