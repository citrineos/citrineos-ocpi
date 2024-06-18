import { ICache } from '@citrineos/base';

export class CacheWrapper {
  cache: ICache;

  constructor(cache: ICache) {
    this.cache = cache;
  }
}
