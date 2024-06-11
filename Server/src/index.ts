import 'reflect-metadata';
import {CommandsModule} from "@citrineos/ocpi-commands";
import {VersionsModule} from "@citrineos/ocpi-versions";
import {OcpiServer, OcpiServerConfig} from "@citrineos/ocpi-base";
import {EventGroup, ICache, IMessageHandler, IMessageSender, SystemConfig} from "@citrineos/base";
import {MemoryCache, RabbitMqReceiver, RabbitMqSender, RedisCache} from "@citrineos/util";
import {type ILogObj, Logger} from 'tslog';
import {createLocalConfig} from "./config";
import {CredentialsModule} from "@citrineos/ocpi-credentials";

class CitrineOSServer {
    private readonly cache: ICache;
    private readonly config: SystemConfig;
    private readonly logger: Logger<ILogObj>;

    constructor() {
        this.config = createLocalConfig();
        this.cache = this.initCache()
        this.logger = this.initLogger();

        const ocpiServer = new OcpiServer(this.getConfig());

        ocpiServer.run(this.config.ocpiServer.host, this.config.ocpiServer.port);
    }

    protected getConfig() {
        const config = new OcpiServerConfig();

        config.modules = [
            new VersionsModule(
              this.config,
              this.cache,
              this._createHandler(),
              this._createSender(),
              EventGroup.Versions,
              this.logger,
            ),
            new CredentialsModule(
              this.config,
              this.cache,
              this._createHandler(),
              this._createSender(),
              EventGroup.Versions,
              this.logger,
            ),
            new CommandsModule(
                this.config,
                this.cache,
                this._createHandler(),
                this._createSender(),
                EventGroup.Commands,
                this.logger,
            ),
        ]

        return config
    }

    protected _createSender(): IMessageSender {
        return new RabbitMqSender(this.config, this.logger);
    }

    protected _createHandler(): IMessageHandler {
        return new RabbitMqReceiver(this.config, this.logger);
    }

    private initCache(): ICache {
        return (
            this.config.util.cache.redis
                ? new RedisCache({
                    socket: {
                        host: this.config.util.cache.redis.host,
                        port: this.config.util.cache.redis.port,
                    },
                })
                : new MemoryCache());
    }

    private initLogger() {
        return new Logger<ILogObj>({
            name: 'CitrineOS Logger',
            minLevel: this.config.logLevel
        });
    }
}

new CitrineOSServer();
