import 'reflect-metadata';
import {
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
import { OcpiServer, OcpiServerConfig } from '@citrineos/ocpi-base';
import { CommandsModule } from '@citrineos/ocpi-commands';
import { VersionsModule } from '@citrineos/ocpi-versions';
import { CredentialsModule } from '@citrineos/ocpi-credentials';
import { Container } from 'typedi';
import { ChargingProfilesModule } from '@citrineos/ocpi-charging-profiles/dist';

class CitrineOSServer {
  private readonly config: SystemConfig;
  private readonly cache: ICache;
  private readonly logger: Logger<ILogObj>;

  constructor() {
    this.config = createLocalConfig();
    this.cache = this.initCache();
    this.logger = this.initLogger();

    Container.set(Logger, this.logger);

    const ocpiServer = new OcpiServer(
      this.config as OcpiServerConfig,
      this.cache,
      this.logger,
      this.getModuleConfig(),
    );

    ocpiServer.run(this.config.ocpiServer.host, this.config.ocpiServer.port);
  }

  protected getModuleConfig() {
    return [
      {
        module: VersionsModule,
        handler: this._createHandler(),
        sender: this._createSender(),
      },
      {
        module: CredentialsModule,
        handler: this._createHandler(),
        sender: this._createSender(),
      },
      {
        module: CommandsModule,
        handler: this._createHandler(),
        sender: this._createSender(),
      },
      {
        module: ChargingProfilesModule,
        handler: this._createHandler(),
        sender: this._createSender(),
      },
    ];
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
