// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { localConfig } from './envs/local';
import { dockerConfig } from './envs/docker';
import { plainToClass, ServerConfig } from '@citrineos/ocpi-base';

function getConfig(): ServerConfig {
  let systemConfigPlain: any;
  switch (process.env.APP_ENV) {
    case 'local':
      systemConfigPlain = localConfig;
      break;
    case 'docker':
      systemConfigPlain = dockerConfig;
      break;
    default:
      throw new Error('Invalid APP_ENV "${process.env.APP_ENV}"');
  }
  return plainToClass(ServerConfig, systemConfigPlain, false);
}

function parseEnvValue(value: string, targetType: any): any {
  if (targetType === Boolean) {
    return value === 'true';
  }
  if (targetType === Number) {
    return Number(value);
  }
  if (targetType === String) {
    return value;
  }
  // if (targetType === ConfigEnum) { // todo parse enum
  //   return value as ConfigEnum;
  // }
  return value;
}

function ensureAllProperties<T>(instance: T, cls: new () => T): T {
  const defaultInstance = new cls();
  for (const key of Object.keys(defaultInstance as any)) {
    const defaultValue = (defaultInstance as any)[key];
    const instanceValue = (instance as any)[key];

    // If the key does not exist in the instance, set it to undefined
    if (!(key in (instance as any))) {
      (instance as any)[key] = undefined;
    } else if (
      typeof defaultValue === 'object' &&
      defaultValue !== null &&
      !(defaultValue instanceof Array)
    ) {
      // If the default value is a nested object, recurse
      (instance as any)[key] = ensureAllProperties(
        instanceValue || {},
        defaultValue.constructor,
      );
    }
  }

  return instance;
}

function overrideConfigWithEnv(
  config: ServerConfig,
  parentKey = '',
): ServerConfig {
  const configEntries = Object.entries(config as any);
  for (const [key, value] of configEntries) {
    const envVar = `${parentKey}${key.toUpperCase()}`;
    if (typeof value === 'object' && value !== null) {
      (config as any)[key] = overrideConfigWithEnv(value as any, `${envVar}_`);
    } else {
      const envValue = process.env[`CITRINEOS_${envVar}`];
      if (envValue) {
        const targetType = Reflect.getMetadata(
          'design:type',
          config as any,
          key,
        );
        (config as any)[key] = parseEnvValue(envValue, targetType);
      }
    }
  }

  return config;
}

const serverConfig: ServerConfig = getConfig();
const fullConfig = ensureAllProperties<ServerConfig>(
  serverConfig,
  ServerConfig,
);
const finalConfig = overrideConfigWithEnv(fullConfig);
export const systemConfig = finalConfig;
