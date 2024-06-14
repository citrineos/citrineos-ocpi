import { Service } from "typedi";
import { MemoryCache } from "@citrineos/util";
import { ICache } from "@citrineos/base";
import { OcpiServerConfig } from "./ocpi.server.config";

@Service()
export class OcpiCacheConfig {
  cache: ICache;

  // TODO make constructor dynamic
  constructor(serverConfig: OcpiServerConfig) {
    this.cache = new MemoryCache();

    // this.cache = serverConfig.util.cache.redis ?
    //   new RedisCache({
    //     socket: {
    //       host: serverConfig.util.cache.redis.host,
    //       port: serverConfig.util.cache.redis.port
    //     }
    //   }) : new MemoryCache();
  }
}
