// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0
import {
  AbstractDtoModule,
  AsDtoEventHandler,
  DtoEventObjectType,
  DtoEventType,
  IDtoEvent,
  IDtoEventReceiver,
  OcpiConfig,
  OcpiModule,
} from '@citrineos/ocpi-base';
import { Tariff } from '@citrineos/data';
import { ILogObj, Logger } from 'tslog';
import { Service } from 'typedi';
import { TariffsModuleApi } from './module/TariffsModuleApi';

export { TariffsModuleApi } from './module/TariffsModuleApi';
export { ITariffsModuleApi } from './module/ITariffsModuleApi';

@Service()
export class TariffsModule extends AbstractDtoModule implements OcpiModule {
  constructor(
    config: OcpiConfig,
    receiver: IDtoEventReceiver,
    logger?: Logger<ILogObj>,
  ) {
    super(config, receiver, logger);
  }

  getController(): any {
    return TariffsModuleApi;
  }

  async init(): Promise<void> {
    this._logger.info('Initializing Tariffs Module...');
    await this._receiver.init();
    this._logger.info('Tariffs Module initialized successfully.');
  }

  async shutdown(): Promise<void> {
    this._logger.info('Shutting down Tariffs Module...');
    await super.shutdown();
  }

  @AsDtoEventHandler(
    DtoEventType.INSERT,
    DtoEventObjectType.Tariff,
    'TariffNotification',
  )
  async handleTariffInsert(event: IDtoEvent<Tariff>): Promise<void> {
    this._logger.info(`Handling Tariff Insert: ${JSON.stringify(event)}`);
    // Inserts are Tariff PUT requests
  }

  @AsDtoEventHandler(
    DtoEventType.UPDATE,
    DtoEventObjectType.Tariff,
    'TariffNotification',
  )
  async handleTariffUpdate(event: IDtoEvent<Partial<Tariff>>): Promise<void> {
    this._logger.info(`Handling Tariff Update: ${JSON.stringify(event)}`);
    // Updates are Tariff PUT requests
  }

  @AsDtoEventHandler(
    DtoEventType.DELETE,
    DtoEventObjectType.Tariff,
    'TariffNotification',
  )
  async handleTariffDelete(event: IDtoEvent<Tariff>): Promise<void> {
    this._logger.info(`Handling Tariff Delete: ${JSON.stringify(event)}`);
    // Deletes are Tariff DELETE requests
  }
}
