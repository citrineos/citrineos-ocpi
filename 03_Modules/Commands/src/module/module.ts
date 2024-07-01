import { Container } from 'typedi';

import { CommandsOcppHandlers } from './handlers';
import { Service } from 'typedi';

import { CommandsModuleApi } from './api';
import {
  CacheWrapper,
  CommandsClientApi,
  OcpiModule,
  OcpiServerConfig,
  ResponseUrlRepository,
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
    readonly config: OcpiServerConfig,
    readonly cacheWrapper: CacheWrapper,
    readonly logger?: Logger<ILogObj>,
  ) {}

  init(handler?: IMessageHandler, sender?: IMessageSender): void {
    Container.set(
      AbstractModule,
      new CommandsOcppHandlers(
        this.config as SystemConfig,
        this.cacheWrapper.cache,
        Container.get(ResponseUrlRepository),
        Container.get(CommandsClientApi),
        sender,
        handler,
        this.logger,
      ),
    );
  }

  getController(): any {
    return CommandsModuleApi;
  }
}
