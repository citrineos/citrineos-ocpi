// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { Container } from 'typedi';
import type { ILogObj } from 'tslog';
import { Logger } from 'tslog';
import {
  bootstrapGireveRetryContainer,
  getOcpiSystemConfig,
  GireveBroadcastRetryWorker,
} from '@citrineos/ocpi-base';
import { createDockerOcpiConfig } from '../config/envs/docker.js';
import { createLocalOcpiConfig } from '../config/envs/local.js';

function loadOcpiConfigForRetry() {
  switch (process.env.APP_ENV) {
    case 'docker':
      return getOcpiSystemConfig(createDockerOcpiConfig());
    default:
      return getOcpiSystemConfig(createLocalOcpiConfig());
  }
}

async function main(): Promise<void> {
  const logger = new Logger<ILogObj>({
    name: 'GireveRetryRunner',
    minLevel: Number(process.env.CITRINEOS_OCPI_LOG_LEVEL ?? 2),
  });

  const ocpiConfig = loadOcpiConfigForRetry();
  bootstrapGireveRetryContainer(ocpiConfig, logger);

  const worker = Container.get(GireveBroadcastRetryWorker);
  await worker.runOnce();
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error: unknown) => {
    console.error('Gireve retry runner failed', error);
    process.exit(1);
  });
