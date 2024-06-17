// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import {OcpiModule,} from '@citrineos/ocpi-base';
import {ICache, IMessageHandler, IMessageSender, SystemConfig} from '@citrineos/base';

import {CredentialsModuleApi} from './module/api';
import {Service} from 'typedi';
import {ILogObj, Logger} from "tslog";
import {CredentialsHandlers} from "./module/module";

export {CredentialsModuleApi} from './module/api';
export {ICredentialsModuleApi} from './module/interface';
export {CredentialsHandlers} from './module/module';

@Service()
export class CredentialsModule implements OcpiModule {
  constructor(
    config: SystemConfig,
    cache: ICache,
    handler: IMessageHandler,
    sender: IMessageSender,
    logger?: Logger<ILogObj>,
  ) {
    new CredentialsHandlers(
      config,
      cache,
      sender,
      handler,
      logger,
    );
  }

  getController(): any {
    return CredentialsModuleApi;
  }
}
