import {
  CacheWrapper,
  OcpiModule,
  OcpiServerConfig,
} from '@citrineos/ocpi-base';
import { IMessageHandler, IMessageSender, SystemConfig } from '@citrineos/base';

import { CredentialsModuleApi } from './module/api';
import { Service } from 'typedi';
import { ILogObj, Logger } from 'tslog';
import { CredentialsHandlers } from './module/module';

export { CredentialsModuleApi } from './module/api';
export { ICredentialsModuleApi } from './module/interface';
export { CredentialsHandlers } from './module/module';

@Service()
export class CredentialsModule implements OcpiModule {
  handler!: IMessageHandler;
  sender!: IMessageSender;

  constructor(
    readonly config: OcpiServerConfig,
    readonly cacheWrapper: CacheWrapper,
    readonly logger?: Logger<ILogObj>,
  ) {}

  init(_handler: IMessageHandler, _sender: IMessageSender): void {
    new CredentialsHandlers(
      this.config as SystemConfig,
      this.cacheWrapper.cache,
      this.sender,
      this.handler,
      this.logger,
    );
  }

  getController(): any {
    return CredentialsModuleApi;
  }
}
