import { Container, Service } from 'typedi';
import {
  SequelizeCallMessageRepository,
  SequelizeReservationRepository,
  SequelizeTransactionEventRepository,
} from '@citrineos/data';

import { CommandsOcppHandlers } from './handlers';

import { CommandsModuleApi } from './api';
import {
  AsyncResponder,
  CacheWrapper,
  OcpiModule,
  ServerConfig,
  SessionMapper,
} from '@citrineos/ocpi-base';
import {
  AbstractModule,
  IMessageHandler,
  IMessageSender,
  SystemConfig,
} from '@citrineos/base';
import { ILogObj, Logger } from 'tslog';

@Service()
export class CommandsModule implements OcpiModule {
  constructor(
    readonly config: ServerConfig,
    readonly cacheWrapper: CacheWrapper,
    readonly logger?: Logger<ILogObj>,
  ) {}

  init(handler?: IMessageHandler, sender?: IMessageSender): void {
    Container.set(
      AbstractModule,
      new CommandsOcppHandlers(
        this.config as SystemConfig,
        this.cacheWrapper.cache,
        Container.get(AsyncResponder),
        Container.get(SequelizeTransactionEventRepository),
        Container.get(SessionMapper),
        sender,
        handler,
        this.logger,
      ),
    );

    Container.set(
      SequelizeTransactionEventRepository,
      new SequelizeTransactionEventRepository(
        this.config as SystemConfig,
        this.logger,
      ),
    );
  }

  getController(): any {
    return CommandsModuleApi;
  }
}
