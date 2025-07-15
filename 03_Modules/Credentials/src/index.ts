import { CacheWrapper, OcpiModule, OcpiConfig } from '@citrineos/ocpi-base';

import { CredentialsModuleApi } from './module/CredentialsModuleApi';
import { Service } from 'typedi';
import { ILogObj, Logger } from 'tslog';

export { CredentialsModuleApi } from './module/CredentialsModuleApi';
export { ICredentialsModuleApi } from './module/ICredentialsModuleApi';

@Service()
export class CredentialsModule implements OcpiModule {
  constructor(
    readonly config: OcpiConfig,
    readonly cacheWrapper: CacheWrapper,
    readonly logger?: Logger<ILogObj>,
  ) {}

  getController(): any {
    return CredentialsModuleApi;
  }
}
