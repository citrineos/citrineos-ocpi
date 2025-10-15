// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable */

const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');

module.exports = tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: ['**/migrations/**/*.js'],
    languageOptions: {
      globals: {
        ...require('globals').node,
      },
    },
  },
  {
    files: ['./00_Base/src/graphql/queries/*.ts'],
    plugins: {
      '@graphql-eslint': require('@graphql-eslint/eslint-plugin'),
    },
    processor: '@graphql-eslint/graphql',
  },
  {
    ignores: ['**/dist/**', '**/node_modules/**'],
  },
);