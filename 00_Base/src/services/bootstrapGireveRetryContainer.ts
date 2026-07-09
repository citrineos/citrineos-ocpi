// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { Container } from 'typedi';
import type { ILogObj } from 'tslog';
import { Logger } from 'tslog';
import { Ajv } from 'ajv';
import addFormats from 'ajv-formats';
import type { OcpiConfig } from '../config/ocpi.types.js';
import { AjvToken, OcpiConfigToken } from '../config/ocpi.types.js';
import { OcpiGraphqlClient } from '../graphql/index.js';

/**
 * Minimal Typedi bootstrap for the Gireve retry CronJob entrypoint.
 * Does not start the OCPI HTTP server or module listeners.
 */
export function bootstrapGireveRetryContainer(
  ocpiConfig: OcpiConfig,
  logger: Logger<ILogObj>,
): void {
  Container.set(OcpiConfigToken, ocpiConfig);
  Container.set(Logger, logger);

  Container.set(
    OcpiGraphqlClient,
    new OcpiGraphqlClient(
      ocpiConfig.graphql.endpoint,
      ocpiConfig.graphql.headers,
    ),
  );

  const ajv = new Ajv({
    removeAdditional: 'all',
    useDefaults: true,
    coerceTypes: 'array',
    strict: false,
  });
  addFormats.default(ajv, {
    mode: 'fast',
    formats: ['date-time'],
  });
  Container.set(AjvToken, ajv);
}
