// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

/** @type {import('ts-jest').JestConfigWithTsJest} */
/* eslint-disable */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFiles: ['reflect-metadata'],
  // Tests/reference (end-to-end over HTTP) and *.integration.test.ts run under vitest:
  // `npm run test:e2e` / `npm run test:integration`.
  testPathIgnorePatterns: [
    '/node_modules/',
    '/Tests/reference/',
    '\\.integration\\.test\\.ts$',
    '/dist/',
  ],
  moduleNameMapper: {
    // packageVersion uses import.meta, which ts-jest's CJS transform rejects.
    '^(\\.{1,2}/)+packageVersion(\\.js)?$':
      '<rootDir>/00_Base/src/__mocks__/packageVersion.ts',
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
