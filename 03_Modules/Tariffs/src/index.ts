// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { TariffsModuleApi } from './module/api';
import { OcpiModule } from '@citrineos/ocpi-base';
import {
  ICache,
  IMessageHandler,
  IMessageSender,
  SystemConfig,
} from '@citrineos/base';
import { ILogObj, Logger } from 'tslog';
import { Service } from 'typedi';
import { TariffsDispatcher } from './module/tariffs.dispatcher';

export { TariffsModuleApi } from './module/api';
export { ITariffsModuleApi } from './module/interface';

@Service()
export class TariffsModule implements OcpiModule {
  constructor(
    private readonly config: SystemConfig,
    private readonly cache: ICache,
    private readonly eventsDispatcher: TariffsDispatcher,
    private readonly logger?: Logger<ILogObj>,
  ) {
    eventsDispatcher.initializeListeners();
  }

  init(_handler?: IMessageHandler, _sender?: IMessageSender): void {}

  getController(): any {
    return TariffsModuleApi;
  }
}
