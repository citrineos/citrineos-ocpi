// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import {
  type AbstractModule,
  type AbstractModuleApi,
  Ajv,
  EventGroup,
  eventGroupFromString,
  type IAuthenticator,
  type ICache,
  type IFileAccess,
  type IMessageHandler,
  type IMessageSender,
  type IModule,
  type IModuleApi,
  SystemConfig,
} from '@citrineos/base';
import {
  Authenticator,
  DirectusUtil,
  MemoryCache,
  RabbitMqReceiver,
  RabbitMqSender,
  RedisCache,
  WebsocketNetworkConnection,
} from '@citrineos/util';
import { type JsonSchemaToTsProvider } from '@fastify/type-provider-json-schema-to-ts';
import addFormats from 'ajv-formats';
import fastify, { type FastifyInstance } from 'fastify';
import { type ILogObj, Logger } from 'tslog';
import { getSystemConfig } from './config';
import { OcpiConfig } from '@citrineos/ocpi-base/dist/config/types';
import { UnknownStationFilter } from '@citrineos/util/dist/networkconnection/authenticator/UnknownStationFilter';
import { ConnectedStationFilter } from '@citrineos/util/dist/networkconnection/authenticator/ConnectedStationFilter';
import { BasicAuthenticationFilter } from '@citrineos/util/dist/networkconnection/authenticator/BasicAuthenticationFilter';
import { RepositoryStore, sequelize, Sequelize } from '@citrineos/data';
import {
  type FastifyRouteSchemaDef,
  type FastifySchemaCompiler,
  type FastifyValidationResult,
} from 'fastify/types/schema';
import {
  AdminApi,
  MessageRouterImpl,
  WebhookDispatcher,
} from '@citrineos/ocpprouter';
import { Container, OcpiServer, ServerConfig } from '@citrineos/ocpi-base';
import { CommandsModule } from '@citrineos/ocpi-commands';
import { VersionsModule } from '@citrineos/ocpi-versions';
import { CredentialsModule } from '@citrineos/ocpi-credentials';
import { LocationsModule } from '@citrineos/ocpi-locations';
import { SessionsModule } from '@citrineos/ocpi-sessions';
import { ChargingProfilesModule } from '@citrineos/ocpi-charging-profiles';
import { TariffsModule } from '@citrineos/ocpi-tariffs';
import { CdrsModule } from '@citrineos/ocpi-cdrs';
import { RealTimeAuthorizer, TokensModule } from '@citrineos/ocpi-tokens';

interface ModuleConfig {
  ModuleClass: new (...args: any[]) => AbstractModule;
  ModuleApiClass: new (...args: any[]) => AbstractModuleApi<any>;
  configModule: any; // todo type?
}

export class CitrineOSServer {
  /**
   * Fields
   */
  private readonly _config: OcpiConfig;
  private readonly _logger: Logger<ILogObj>;
  private readonly _server: FastifyInstance;
  private readonly _cache: ICache;
  private readonly _ajv: Ajv;
  private readonly _fileAccess: IFileAccess;
  private readonly modules: IModule[] = [];
  private readonly apis: IModuleApi[] = [];
  private _sequelizeInstance!: Sequelize;
  private host?: string;
  private port?: number;
  private eventGroup?: EventGroup;
  private _authenticator?: IAuthenticator;
  private _networkConnection?: WebsocketNetworkConnection;
  private _repositoryStore!: RepositoryStore;
  private ocpiRealTimeAuthorizer!: RealTimeAuthorizer;
  private ocpiServer!: OcpiServer;

  /**
   * Constructor for the class.
   *
   * @param {EventGroup} appName - app type
   * @param {OcpiConfig} config - config
   * @param {FastifyInstance} server - optional Fastify server instance
   * @param {Ajv} ajv - optional Ajv JSON schema validator instance
   * @param {ICache} cache - cache
   */
  // todo rename event group to type
  constructor(
    appName: string,
    config: OcpiConfig,
    server?: FastifyInstance,
    ajv?: Ajv,
    cache?: ICache,
    fileAccess?: IFileAccess,
  ) {
    // Set event group
    this.eventGroup = eventGroupFromString(appName);

    // Set system config
    // TODO: Create and export config schemas for each util module, such as amqp, redis, kafka, etc, to avoid passing them possibly invalid configuration
    if (!config.util.messageBroker.amqp) {
      throw new Error(
        'This server implementation requires amqp configuration for rabbitMQ.',
      );
    }
    this._config = config;

    // Create server instance
    this._server =
      server || fastify().withTypeProvider<JsonSchemaToTsProvider>();

    // Add health check
    this.initHealthCheck();

    // Create Ajv JSON schema validator instance
    this._ajv = this.initAjv(ajv);
    this.addAjvFormats();

    // Initialize parent logger
    this._logger = this.initLogger();

    // Force sync database
    this.initDb();

    // Init repo store
    this.initRepositoryStore();

    // Set cache implementation
    this._cache = this.initCache(cache);

    // Initialize Swagger if enabled
    this.initSwagger();

    let directusUtil;

    // Initialize File Access Implementation
    this._fileAccess = this.initFileAccess(fileAccess, directusUtil);

    // Register AJV for schema validation
    this.registerAjv();

    // start ocpi needs to happen first to load authorizer
    this.startOcpiServer();

    // Initialize module & API
    // Always initialize API after SwaggerUI
    this.initSystem();

    process.on('SIGINT', this.shutdown.bind(this));
    process.on('SIGTERM', this.shutdown.bind(this));
    process.on('SIGQUIT', this.shutdown.bind(this));
  }

  shutdown() {
    // todo shut down depending on setup
    // Shut down all modules and central system
    this.modules.forEach((module) => {
      module.shutdown();
    });
    this._networkConnection?.shutdown();

    // Shutdown server
    this._server.close().then(); // todo async?

    setTimeout(() => {
      console.log('Exiting...');
      process.exit(1);
    }, 2000);
  }

  async run(): Promise<void> {
    try {
      await this.ocpiServer.initialize();
      this.ocpiServer.run(
        this._config.ocpiServer.host,
        this._config.ocpiServer.port,
      );
      await this._server
        .listen({
          host: this.host,
          port: this.port,
        })
        .then((address) => {
          this._logger?.info(`Server listening at ${address}`);
        })
        .catch((error) => {
          this._logger?.error(error);
          process.exit(1);
        });
      // TODO Push config to microservices
    } catch (error) {
      await Promise.reject(error);
    }
  }

  protected _createSender(): IMessageSender {
    // Create a compatible config object for RabbitMqSender
    const amqpConfig = {
      util: {
        messageBroker: {
          amqp: this._config.util.messageBroker.amqp,
        },
      },
    };
    return new RabbitMqSender(amqpConfig as SystemConfig, this._logger);
  }

  protected _createHandler(): IMessageHandler {
    // Create a compatible config object for RabbitMqReceiver
    const amqpConfig = {
      util: {
        messageBroker: {
          amqp: this._config.util.messageBroker.amqp,
        },
      },
    };
    return new RabbitMqReceiver(amqpConfig as SystemConfig, this._logger);
  }

  protected getOcpiModuleConfig() {
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
        module: LocationsModule,
        handler: this._createHandler(),
        sender: this._createSender(),
      },
      {
        module: SessionsModule,
        handler: this._createHandler(),
        sender: this._createSender(),
      },
      {
        module: ChargingProfilesModule,
        handler: this._createHandler(),
        sender: this._createSender(),
      },
      {
        module: TariffsModule,
        handler: this._createHandler(),
        sender: this._createSender(),
      },
      {
        module: CdrsModule,
        handler: this._createHandler(),
        sender: this._createSender(),
      },
      {
        module: TokensModule,
        handler: this._createHandler(),
        sender: this._createSender(),
      },
    ];
  }

  private initHealthCheck() {
    this._server.get('/health', async () => ({ status: 'healthy' }));
  }

  private initAjv(ajv?: Ajv) {
    return (
      ajv ||
      new Ajv({
        removeAdditional: 'all',
        useDefaults: true,
        coerceTypes: 'array',
        strict: false,
      })
    );
  }

  private addAjvFormats() {
    addFormats(this._ajv, {
      mode: 'fast',
      formats: ['date-time'],
    });
  }

  private initLogger() {
    return new Logger<ILogObj>({
      name: 'CitrineOS Logger',
      minLevel: this._config.logLevel,
      hideLogPositionForProduction: this._config.env === 'production',
      // Disable colors for cloud deployment as some cloud logging environments such as cloudwatch can not interpret colors
      stylePrettyLogs: process.env.DEPLOYMENT_TARGET !== 'cloud',
    });
  }

  private initDb() {
    // Create a minimal config for database initialization
    // Since OCPI config doesn't include database settings, we'll use environment variables
    const dbConfig = {
      data: {
        sequelize: {
          password: process.env.DB_PASSWORD || '',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432'),
          database: process.env.DB_NAME || 'citrineos',
          username: process.env.DB_USER || 'citrineos',
          storage: process.env.DB_STORAGE || '',
          sync: process.env.DB_SYNC === 'true',
        },
      },
    };
    this._sequelizeInstance = sequelize.DefaultSequelizeInstance.getInstance(
      dbConfig as SystemConfig,
      this._logger,
    );
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

  private initSwagger() {
    // Note: Swagger configuration removed from new OCPI config structure
    // If swagger is needed, it should be added back to the config schema
    // if (this._config.util.swagger) {
    //   initSwagger(this._config as SystemConfig, this._server);
    // }
  }

  private registerAjv() {
    // todo type schema instead of any
    const fastifySchemaCompiler: FastifySchemaCompiler<any> = (
      routeSchema: FastifyRouteSchemaDef<any>,
    ) => this._ajv?.compile(routeSchema.schema) as FastifyValidationResult;
    this._server.setValidatorCompiler(fastifySchemaCompiler);
  }

  private initNetworkConnection() {
    // Create database config for repository initialization
    const dbConfig = {
      data: {
        sequelize: {
          password: process.env.DB_PASSWORD || '',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432'),
          database: process.env.DB_NAME || 'citrineos',
          username: process.env.DB_USER || 'citrineos',
          storage: process.env.DB_STORAGE || '',
          sync: process.env.DB_SYNC === 'true',
        },
      },
    };

    this._authenticator = new Authenticator(
      new UnknownStationFilter(
        new sequelize.SequelizeLocationRepository(
          dbConfig as SystemConfig,
          this._logger,
        ),
        this._logger,
      ),
      new ConnectedStationFilter(this._cache, this._logger),
      new BasicAuthenticationFilter(
        new sequelize.SequelizeDeviceModelRepository(
          dbConfig as SystemConfig,
          this._logger,
        ),
        this._logger,
      ),
      this._logger,
    );

    const webhookDispatcher = new WebhookDispatcher(
      this._repositoryStore.subscriptionRepository,
    );

    // Create amqp config for message router
    const amqpConfig = {
      util: {
        messageBroker: {
          amqp: this._config.util.messageBroker.amqp,
        },
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const router = new MessageRouterImpl(
      amqpConfig as SystemConfig,
      this._cache,
      this._createSender(),
      this._createHandler(),
      webhookDispatcher,
      async (_identifier: string, _message: string) => false,
      this._logger,
      this._ajv,
    );

    const networkConfig = {
      data: {
        sequelize: {
          password: process.env.DB_PASSWORD || '',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432'),
          database: process.env.DB_NAME || 'citrineos',
          username: process.env.DB_USER || 'citrineos',
          storage: process.env.DB_STORAGE || '',
          sync: process.env.DB_SYNC === 'true',
        },
      },
      util: {
        networkConnection: {
          maxRetries: this._config.util.networkConnection.maxRetries,
          retryDelay: this._config.util.networkConnection.retryDelay,
          timeout: this._config.util.networkConnection.timeout,
          websocketServers: [], // OCPI server doesn't use websocket servers
        },
      },
    };

    this._networkConnection = new WebsocketNetworkConnection(
      networkConfig as unknown as SystemConfig,
      this._cache,
      this._authenticator,
      router,
      this._logger,
    );

    this.apis.push(new AdminApi(router, this._server, this._logger));

    this.host = this._config.centralSystem.host;
    this.port = this._config.centralSystem.port;
  }

  private initAllModules() {
    this.ocpiRealTimeAuthorizer = Container.get(RealTimeAuthorizer);

    // Note: OCPP modules removed as they are not relevant for OCPI server
    // Only OCPI-specific modules will be initialized in startOcpiServer()

    this._logger.info('OCPI server modules initialized');
  }

  private startOcpiServer() {
    // Create a compatible config for OcpiServer
    const ocpiServerConfig = {
      ...this._config,
      // Map new structure to old structure expected by OcpiServer
      data: {
        sequelize: {
          // Since we removed database access, provide minimal structure
          // This is a placeholder to maintain compatibility
          password: '',
          host: '',
          port: 5432,
          database: '',
          username: '',
          storage: '',
          sync: false,
        },
      },
      modules: {
        // OCPI modules configuration from the new config
        credentials: this._config.modules.credentials,
        locations: this._config.modules.locations,
        sessions: this._config.modules.sessions,
        tariffs: this._config.modules.tariffs,
        tokens: this._config.modules.tokens,
        cdrs: this._config.modules.cdrs,
        chargingProfiles: this._config.modules.chargingProfiles,
        commands: this._config.modules.commands,
        versions: this._config.modules.versions,
      },
      util: {
        cache: this._config.util.cache,
        messageBroker: this._config.util.messageBroker,
        authProvider: this._config.util.authProvider,
      },
    };

    this.ocpiServer = new OcpiServer(
      ocpiServerConfig as unknown as ServerConfig,
      this._cache,
      this._logger,
      this.getOcpiModuleConfig(),
      this._repositoryStore,
    );
  }

  private initModule(_moduleConfig: ModuleConfig) {
    // OCPP modules are not supported in OCPI server
    throw new Error(
      'OCPP modules are not supported in OCPI server configuration',
    );
  }

  private getModuleConfig(): ModuleConfig {
    // OCPP modules are not supported in OCPI server
    throw new Error(
      'OCPP modules are not supported in OCPI server configuration. Only OCPI modules are available.',
    );
  }

  private initSystem() {
    if (this.eventGroup === EventGroup.All) {
      this.initNetworkConnection();
      this.initAllModules();
    } else if (this.eventGroup === EventGroup.General) {
      this.initNetworkConnection();
    } else {
      const moduleConfig: ModuleConfig = this.getModuleConfig();
      this.initModule(moduleConfig);
    }
  }

  private initFileAccess(
    fileAccess?: IFileAccess,
    directus?: IFileAccess,
  ): IFileAccess {
    if (fileAccess) {
      return fileAccess;
    }
    if (directus) {
      return directus;
    }

    // Create a minimal config for DirectusUtil
    const directusConfig = {
      data: {
        sequelize: {
          password: process.env.DB_PASSWORD || '',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432'),
          database: process.env.DB_NAME || 'citrineos',
          username: process.env.DB_USER || 'citrineos',
          storage: process.env.DB_STORAGE || '',
          sync: process.env.DB_SYNC === 'true',
        },
      },
      util: {
        directus: {
          host: process.env.DIRECTUS_HOST || 'localhost',
          port: parseInt(process.env.DIRECTUS_PORT || '8055'),
          generateFlows: process.env.DIRECTUS_GENERATE_FLOWS === 'true',
        },
      },
    };

    return new DirectusUtil(directusConfig as SystemConfig, this._logger);
  }

  private initRepositoryStore() {
    // Create a minimal config for RepositoryStore
    const dbConfig = {
      data: {
        sequelize: {
          password: process.env.DB_PASSWORD || '',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432'),
          database: process.env.DB_NAME || 'citrineos',
          username: process.env.DB_USER || 'citrineos',
          storage: process.env.DB_STORAGE || '',
          sync: process.env.DB_SYNC === 'true',
        },
      },
    };

    this._repositoryStore = new RepositoryStore(
      dbConfig as SystemConfig,
      this._logger,
      this._sequelizeInstance,
    );
  }
}

// Load config asynchronously and start the server
(async () => {
  try {
    const config = await getSystemConfig();
    new CitrineOSServer(process.env.APP_NAME as EventGroup, config)
      .run()
      .catch((error: any) => {
        console.error(error);
        process.exit(1);
      });
  } catch (error) {
    console.error('Failed to load configuration:', error);
    process.exit(1);
  }
})();
