// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { ICache } from '@citrineos/base';
import { Logger } from 'tslog';

export class CacheWrapper {
  constructor(
    private readonly cache: ICache,
    private readonly logger: Logger<any>,
  ) {}

  getCache(): ICache {
    return this.cache;
  }

  async waitForCacheKey(
    key: string,
    timeoutMs: number = 30000,
  ): Promise<boolean> {
    if (await this.cache.get(key)) {
      return true;
    }

    this.logger.info(`Waiting for cache key ${key}...`);

    const result = await this.cache.onChange<string>(key, timeoutMs / 1000);

    if (result) {
      this.logger.info(`Cache key ${key} found.`);
      return true;
    } else {
      this.logger.warn(`Timeout waiting for cache key ${key}`);
      return false;
    }
  }
}
