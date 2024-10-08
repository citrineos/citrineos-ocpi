// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { ChargingProfilesModuleApi } from './module/ChargingProfilesModuleApi';
import {
  AsyncResponder,
  CacheWrapper,
  ChargingProfilesClientApi,
  ClientInformationRepository,
  EndpointRepository,
  OcpiModule,
  ServerConfig,
  SessionChargingProfileRepository,
  SessionMapper,
} from '@citrineos/ocpi-base';
import {
  AbstractModule,
  IMessageHandler,
  IMessageSender,
  SystemConfig,
} from '@citrineos/base';
import { ILogObj, Logger } from 'tslog';

import { Container, Service } from 'typedi';
import { useContainer } from 'routing-controllers';
import {
  SequelizeChargingProfileRepository,
  SequelizeTransactionEventRepository,
} from '@citrineos/data';
import { ChargingProfilesOcppHandlers } from './module/ChargingProfilesOcppHandlers';

useContainer(Container);

@Service()
export class ChargingProfilesModule implements OcpiModule {
  constructor(
    readonly config: ServerConfig,
    readonly cache: CacheWrapper,
    readonly logger?: Logger<ILogObj>,
  ) {
    Container.set(
      SequelizeTransactionEventRepository,
      new SequelizeTransactionEventRepository(config as SystemConfig, logger),
    );
    Container.set(
      SequelizeChargingProfileRepository,
      new SequelizeChargingProfileRepository(config as SystemConfig, logger),
    );
  }

  init(handler?: IMessageHandler, sender?: IMessageSender): void {
    Container.set(
      AbstractModule,
      new ChargingProfilesOcppHandlers(
        this.config as SystemConfig,
        this.cache.cache,
        Container.get(AsyncResponder),
        Container.get(ChargingProfilesClientApi),
        Container.get(SequelizeTransactionEventRepository),
        Container.get(EndpointRepository),
        Container.get(ClientInformationRepository),
        Container.get(SessionChargingProfileRepository),
        Container.get(SessionMapper),
        handler,
        sender,
        this.logger,
      ),
    );
  }

  getController(): any {
    return ChargingProfilesModuleApi;
  }
}
