import 'reflect-metadata';
import {
  EventGroup,
  ICache,
  IMessageHandler,
  IMessageSender,
  SystemConfig,
} from '@citrineos/base';
import { type ILogObj, Logger } from 'tslog';
import { createLocalConfig } from './config';
import {
  MemoryCache,
  RabbitMqReceiver,
  RabbitMqSender,
  RedisCache,
} from '@citrineos/util';
import {
  OcpiModuleConfig,
  OcpiServer,
  OcpiServerConfig,
} from '@citrineos/ocpi-base';
import { CommandsModule } from '@citrineos/ocpi-commands';
import { VersionsModule } from '@citrineos/ocpi-versions';

class CitrineOSServer {
  private readonly config: SystemConfig;
  private readonly cache: ICache;
  private readonly logger: Logger<ILogObj>;

  constructor() {
    this.config = createLocalConfig();
    this.cache = this.initCache();
    this.logger = this.initLogger();

    const ocpiServer = new OcpiServer(
      this.getModuleConfig(),
      this.config as OcpiServerConfig,
    );

    ocpiServer.run(this.config.ocpiServer.host, this.config.ocpiServer.port);
  }

  protected getModuleConfig() {
    const config = new OcpiModuleConfig();

        config.modules = [
            new CommandsModule(
                this.config,
                this.cache,
                this._createHandler(),
                this._createSender(),
                EventGroup.Commands,
                this.logger,
            ),
            new LocationsModule(
                this.config,
                this.cache,
                this._createHandler(),
                this._createSender(),
                this.logger,
            ),
            new VersionsModule(
                this.config,
                this.cache,
                this._createHandler(),
                this._createSender(),
                EventGroup.Versions,
                this.logger,
            )
        ]

    return config;
  }

  protected _createSender(): IMessageSender {
    return new RabbitMqSender(this.config, this.logger);
  }

  protected _createHandler(): IMessageHandler {
    return new RabbitMqReceiver(this.config, this.logger);
  }

  private initCache(): ICache {
    return this.config.util.cache.redis
      ? new RedisCache({
          socket: {
            host: this.config.util.cache.redis.host,
            port: this.config.util.cache.redis.port,
          },
        })
      : new MemoryCache();
  }

  private initLogger() {
    return new Logger<ILogObj>({
      name: 'CitrineOS Logger',
      minLevel: this.config.logLevel,
    });
  }
}

new CitrineOSServer();
