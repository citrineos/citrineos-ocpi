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
import { MeterValue, Transaction } from '@citrineos/data';
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
    'TransactionNotification',
  )
  async handleTransactionInsert(event: IDtoEvent<Transaction>): Promise<void> {
    this._logger.info(`Handling Transaction Insert: ${JSON.stringify(event)}`);
    // Inserts are Session PUT requests
  }

  @AsDtoEventHandler(
    DtoEventType.UPDATE,
    DtoEventObjectType.Transaction,
    'TransactionNotification',
  )
  async handleTransactionUpdate(
    event: IDtoEvent<Partial<Transaction>>,
  ): Promise<void> {
    this._logger.info(`Handling Transaction Update: ${JSON.stringify(event)}`);
    // All updates are Session PATCH requests
    if (event.payload.isActive === false) {
      this._logger.info(`Transaction is no longer active: ${event.eventId}`);
      // This triggers a Cdr POST request
    }
  }

  @AsDtoEventHandler(
    DtoEventType.INSERT,
    DtoEventObjectType.MeterValue,
    'MeterValueNotification',
  )
  async handleMeterValueInsert(event: IDtoEvent<MeterValue>): Promise<void> {
    this._logger.info(`Handling Meter Value Insert: ${JSON.stringify(event)}`);
    if (event.payload.transactionDatabaseId) {
      this._logger.info(
        `Meter Value belongs to Transaction: ${event.payload.transactionDatabaseId}`,
      );
      // The meter value should be converted to a charging period for a Session PATCH request
    }
  }
}
