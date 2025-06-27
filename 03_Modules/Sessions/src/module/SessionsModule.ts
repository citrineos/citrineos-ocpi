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
} from '@citrineos/ocpi-base';
import { SystemConfig } from '@citrineos/base';
import { Transaction, TransactionEvent } from '@citrineos/data';
import { ILogObj, Logger } from 'tslog';

export class SessionsModule extends AbstractDtoModule {
  constructor(
    config: SystemConfig,
    receiver: IDtoEventReceiver,
    logger?: Logger<ILogObj>,
  ) {
    super(config, receiver, logger);
  }

  async init(): Promise<void> {
    this._logger.info('Initializing Sessions Module...');
    await this._receiver.init();
    this._logger.info('Sessions Module initialized successfully.');
  }

  async shutdown(): Promise<void> {
    this._logger.info('Shutting down Sessions Module...');
    await super.shutdown();
  }

  @AsDtoEventHandler(
    DtoEventType.INSERT,
    DtoEventObjectType.Transaction,
    'TransactionNotifications',
  )
  async handleTransactionInsert(event: IDtoEvent<Transaction>): Promise<void> {
    this._logger.info(`Handling Transaction Insert: ${JSON.stringify(event)}`);
    // Handle the insert event logic here
  }

  @AsDtoEventHandler(
    DtoEventType.UPDATE,
    DtoEventObjectType.Transaction,
    'TransactionNotifications',
  )
  async handleTransactionUpdate(event: IDtoEvent<Partial<Transaction>>): Promise<void> {
    this._logger.info(`Handling Transaction Update: ${JSON.stringify(event)}`);
    // Handle the insert event logic here
  }

  @AsDtoEventHandler(
    DtoEventType.DELETE,
    DtoEventObjectType.Transaction,
    'TransactionNotifications',
  )
  async handleTransactionDelete(event: IDtoEvent<Partial<Transaction>>): Promise<void> {
    this._logger.info(`Handling Transaction Delete: ${JSON.stringify(event)}`);
    // Handle the insert event logic here
  }

  @AsDtoEventHandler(
    DtoEventType.INSERT,
    DtoEventObjectType.TransactionEvent,
    'TransactionEventNotifications',
  )
  async handleTransactionEventInsert(event: IDtoEvent<Partial<TransactionEvent>>): Promise<void> {
    this._logger.info(`Handling Transaction Event Insert: ${JSON.stringify(event)}`);
    // Handle the insert event logic here
  }
}
