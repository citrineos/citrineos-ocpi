import { CacheWrapper, OcpiModule, ServerConfig } from '@citrineos/ocpi-base';
import { IMessageHandler, IMessageSender, SystemConfig } from '@citrineos/base';

import { CredentialsModuleApi } from './module/CredentialsModuleApi';
import { Service } from 'typedi';
import { ILogObj, Logger } from 'tslog';
import { CredentialsHandlers } from './module/CredentialsHandlers';

export { CredentialsModuleApi } from './module/CredentialsModuleApi';
export { ICredentialsModuleApi } from './module/ICredentialsModuleApi';
export { CredentialsHandlers } from './module/CredentialsHandlers';

@Service()
export class CredentialsModule implements OcpiModule {
  handler!: IMessageHandler;
  sender!: IMessageSender;

  constructor(
    readonly config: ServerConfig,
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
