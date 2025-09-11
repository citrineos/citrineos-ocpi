// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { ICache } from '@citrineos/base';

export class CacheWrapper {
  cache: ICache;

  constructor(cache: ICache) {
    this.cache = cache;
  }
}
