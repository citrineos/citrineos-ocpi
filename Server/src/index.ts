import 'reflect-metadata';
import Koa from 'koa';
import {CommandsModule} from "@citrineos/ocpi-commands";
import {VersionsModule} from "@citrineos/ocpi-versions";
import {
    EventGroup,
    ICache,
    IFileAccess,
    IMessageHandler,
    IMessageSender,
    SystemConfig
} from "@citrineos/base";
import {
    DirectusUtil, MemoryCache,
    RabbitMqReceiver,
    RabbitMqSender, RedisCache,
} from "@citrineos/util";
import {systemConfig} from "./config";
import {type ILogObj, Logger} from 'tslog';
import {OcpiModuleConfig} from "@citrineos/ocpi-base";
import {GlobalExceptionHandler} from "@citrineos/ocpi-base";
import {LoggingMiddleware} from "@citrineos/ocpi-base";

class CitrineOSServer {
    private readonly _config: SystemConfig;
    private readonly _logger: Logger<ILogObj>;
    private readonly _app: Koa;
    private readonly _cache: ICache;
    private readonly host?: string;
    private readonly port?: number;

    constructor(
        appName: string,
        config: SystemConfig,
        server?: Koa,
        cache?: ICache,
    ) {
        this.host = "localhost"
        this.port = 8080

        this._config = config;

        this._app = server || new Koa();

        // this._app = useKoaServer(server, { controllers: [CommandsModuleApi] });

        this._logger = this.initLogger();

        this._cache = this.initCache(cache);

        this._initModules();
    }

    async run(): Promise<void> {
        try {
            this._app.on('error', (err, _ctx) => {
                console.log('Error intercepted by Koa:', err);
            });
            this._app.listen({
                host: this.host,
                port: this.port,
            });
            console.log(`Server started on port ${this.port}`);
        } catch (error) {
            await Promise.reject(error);
        }
    }

    protected _createSender(): IMessageSender {
        return new RabbitMqSender(this._config, this._logger);
    }

    protected _createHandler(): IMessageHandler {
        return new RabbitMqReceiver(this._config, this._logger);
    }

    protected _initModules() {
        const config = new OcpiModuleConfig();

        config.routePrefix = '/ocpi/:versionId';
        config.middlewares = [GlobalExceptionHandler, LoggingMiddleware];
        config.defaultErrorHandler = false;

        const modules = [
            new CommandsModule(this._app, config),
            new VersionsModule(this._app, config),
        ]
    }

    private initCache(cache?: ICache): ICache {
        return (
            cache ||
            (this._config.util.cache.redis
                ? new RedisCache({
                    socket: {
                        host: this._config.util.cache.redis.host,
                        port: this._config.util.cache.redis.port,
                    },
                })
                : new MemoryCache())
        );
    }

    private initLogger() {
        return new Logger<ILogObj>({
            name: 'CitrineOS Logger',
            minLevel: systemConfig.logLevel,
            hideLogPositionForProduction: systemConfig.env === 'production',
            // Disable colors for cloud deployment as some cloud logging environments such as cloudwatch can not interpret colors
            stylePrettyLogs: process.env.DEPLOYMENT_TARGET !== 'cloud',
        });
    }

    private initFileAccess(
        fileAccess?: IFileAccess,
        directus?: IFileAccess,
    ): IFileAccess {
        return (
            fileAccess || directus || new DirectusUtil(this._config, this._logger)
        );
    }
}

new CitrineOSServer(process.env.APP_NAME as EventGroup, systemConfig)
    .run()
    .catch((error: any) => {
        console.error(error);
        process.exit(1);
    });
