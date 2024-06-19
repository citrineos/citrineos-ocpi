// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { TokensModuleApi } from './module/api';
import {
  CacheWrapper,
  CommandsClientApi,
  OcpiModule,
  OcpiServerConfig,
  ResponseUrlRepository,
} from '@citrineos/ocpi-base';
import {
  EventGroup,
  ICache,
  IMessageHandler,
  IMessageSender,
  SystemConfig,
} from '@citrineos/base';
import { ILogObj, Logger } from 'tslog';
import { Service } from 'typedi';

export { TokensModuleApi } from './module/api';
export { ITokensModuleApi } from './module/interface';

@Service()
export class TokensModule implements OcpiModule {
  constructor(
    readonly config: OcpiServerConfig,
    readonly cache: CacheWrapper,
    readonly logger?: Logger<ILogObj>,
  ) {}

  getController(): any {
    return TokensModuleApi;
  }

  init(handler?: IMessageHandler, sender?: IMessageSender): void {}
}
