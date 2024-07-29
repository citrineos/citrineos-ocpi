// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { TokensModuleApi } from './module/api';
import {
  CacheWrapper,
  OcpiModule,
  OcpiServerConfig,
  TokensService,
} from '@citrineos/ocpi-base';
import { IMessageHandler, IMessageSender, SystemConfig } from '@citrineos/base';
import { ILogObj, Logger } from 'tslog';
import { TokensHandlers } from './module/module';
import { Container, Service } from 'typedi';
import { RealTimeAuthorizer } from './module/authorizer/RealTimeAuthorizer';

export { TokensModuleApi } from './module/api';
export { ITokensModuleApi } from './module/interface';
export { RealTimeAuthorizer } from './module/authorizer/RealTimeAuthorizer';

@Service()
export class TokensModule implements OcpiModule {
  handler!: IMessageHandler;
  sender!: IMessageSender;

  constructor(
    readonly config: OcpiServerConfig,
    readonly cacheWrapper: CacheWrapper,
    readonly logger?: Logger<ILogObj>,
  ) {}

  init(_handler: IMessageHandler, _sender: IMessageSender): void {
    new TokensHandlers(
      this.config as SystemConfig,
      this.cacheWrapper.cache,
      Container.get(TokensService),
      this.sender,
      this.handler,
      this.logger,
    );
    Container.get(RealTimeAuthorizer);
  }

  getController(): any {
    return TokensModuleApi;
  }
}
