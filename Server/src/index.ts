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
  CertificateAuthorityService,
  DirectusUtil,
  initSwagger,
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
import { getOcpiSystemConfig } from '@citrineos/ocpi-base';
import { createServerConfigFromOcpiConfig } from './config/simpleConfigBridge';
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
import {
  Container,
  OcpiServer,
  ServerConfig,
  OcpiConfig,
} from '@citrineos/ocpi-base';
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
  private readonly _ocpiConfig: OcpiConfig;
  private readonly _logger: Logger<ILogObj>;
  private readonly _server: FastifyInstance;
  private readonly _ajv: Ajv;
  private readonly modules: IModule[] = [];
  private readonly apis: IModuleApi[] = [];
  private host?: string;
  private port?: number;
  private eventGroup?: EventGroup;
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
    ocpiConfig: OcpiConfig,
    server?: FastifyInstance,
    ajv?: Ajv,
    cache?: ICache,
    _fileAccess?: IFileAccess,
  ) {
    // Set event group
    this.eventGroup = eventGroupFromString(appName);

    // Set system config
    // TODO: Create and export config schemas for each util module, such as amqp, redis, kafka, etc, to avoid passing them possibly invalid configuration
    // if (!config.util.messageBroker.amqp) {
    //   throw new Error(
    //     'This server implementation requires amqp configuration for rabbitMQ.',
    //   );
    // }
    this._ocpiConfig = ocpiConfig;

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

    // Initialize Swagger if enabled
    // this.initSwagger();

    // Register AJV for schema validation
    this.registerAjv();

    // start ocpi needs to happen first to load authorizer
    // this.startOcpiServer();

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

  // protected _createSender(): IMessageSender {
  //   return new RabbitMqSender(
  //     this._logger,
  //   );
  // }

  // protected _createHandler(): IMessageHandler {
  //   return new RabbitMqReceiver(
  //     this._logger,
  //   );
  // }

  protected getOcpiModuleConfig() {
    return [
      {
        module: VersionsModule,
        // handler: this._createHandler(),
        // sender: this._createSender(),
      },
      {
        module: CredentialsModule,
        // handler: this._createHandler(),
        // sender: this._createSender(),
      },
      {
        module: CommandsModule,
        // handler: this._createHandler(),
        // sender: this._createSender(),
      },
      {
        module: LocationsModule,
        // handler: this._createHandler(),
        // sender: this._createSender(),
      },
      {
        module: SessionsModule,
        // handler: this._createHandler(),
        // sender: this._createSender(),
      },
      {
        module: ChargingProfilesModule,
        // handler: this._createHandler(),
        // sender: this._createSender(),
      },
      {
        module: TariffsModule,
        // handler: this._createHandler(),
        // sender: this._createSender(),
      },
      {
        module: CdrsModule,
        // handler: this._createHandler(),
        // sender: this._createSender(),
      },
      {
        module: TokensModule,
        // handler: this._createHandler(),
        // sender: this._createSender(),
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
      minLevel: this._ocpiConfig.logLevel,
      hideLogPositionForProduction: this._ocpiConfig.env === 'production',
      // Disable colors for cloud deployment as some cloud logging environments such as cloudwatch can not interpret colors
      stylePrettyLogs: process.env.DEPLOYMENT_TARGET !== 'cloud',
    });
  }

  // private initSwagger() {
  //   if (this._ocpiConfig.util.swagger) {
  //     initSwagger(this._ocpiConfig as unknown as SystemConfig, this._server);
  //   }
  // }

  private registerAjv() {
    // todo type schema instead of any
    const fastifySchemaCompiler: FastifySchemaCompiler<any> = (
      routeSchema: FastifyRouteSchemaDef<any>,
    ) => this._ajv?.compile(routeSchema.schema) as FastifyValidationResult;
    this._server.setValidatorCompiler(fastifySchemaCompiler);
  }

  // private startOcpiServer() {
  //   this.ocpiServer = new OcpiServer(
  //     this._ocpiConfig,
  //     this._cache,
  //     this._logger,
  //     this.getOcpiModuleConfig(),
  //   );
  // }

  private initSystem() {
    if (this.eventGroup === EventGroup.All) {
      // this.initNetworkConnection();
      // this.initAllModules();
    } else if (this.eventGroup === EventGroup.General) {
      // this.initNetworkConnection();
    } else {
      // const moduleConfig: ModuleConfig = this.getModuleConfig();
      // this.initModule(moduleConfig);
    }
  }

}

// Load config using new OCPI config system
import { createDockerOcpiConfig } from './config/envs/docker';
import { createLocalOcpiConfig } from './config/envs/local';

function getServerOcpiConfig() {
  switch (process.env.APP_ENV) {
    case 'docker':
      return createDockerOcpiConfig();
    case 'local':
      return createLocalOcpiConfig();
    default:
      return createLocalOcpiConfig();
  }
}

const ocpiConfig = getOcpiSystemConfig(getServerOcpiConfig());

new CitrineOSServer(
  process.env.APP_NAME as EventGroup,
  ocpiConfig,
)
  .run()
  .catch((error: any) => {
    console.error(error);
    process.exit(1);
  });
