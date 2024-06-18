// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { SessionsModuleApi } from './module/api';
import {
  CacheWrapper,
  OcpiModule,
  OcpiServerConfig,
} from '@citrineos/ocpi-base';
import {
  IMessageHandler,
  IMessageSender,
  SystemConfig,
} from '../../../../citrineos-core/00_Base';
import { ILogObj, Logger } from 'tslog';
import { Container, Service } from 'typedi';
import { SessionsOcppHandlers } from './module/handlers';
import {
  SequelizeLocationRepository,
  SequelizeTransactionEventRepository,
} from '../../../../citrineos-core/01_Data/src/layers/sequelize';

export { SessionsModuleApi } from './module/api';
export { ISessionsModuleApi } from './module/interface';

@Service()
export class SessionsModule implements OcpiModule {
  handler!: IMessageHandler;
  sender!: IMessageSender;

  constructor(
    readonly config: OcpiServerConfig,
    readonly cache: CacheWrapper,
    readonly logger?: Logger<ILogObj>,
  ) {
    Container.set(
      SequelizeTransactionEventRepository,
      new SequelizeTransactionEventRepository(config as SystemConfig, logger),
    );

    Container.set(
      SequelizeLocationRepository,
      new SequelizeLocationRepository(config as SystemConfig, logger),
    );
  }

  init(handler: IMessageHandler, sender: IMessageSender): void {
    this.handler = handler;
    this.sender = sender;
    new SessionsOcppHandlers(
      this.config as SystemConfig,
      this.cache.cache,
      this.sender,
      this.handler,
      this.logger,
    );
  }

  getController(): any {
    return SessionsModuleApi;
  }
}
