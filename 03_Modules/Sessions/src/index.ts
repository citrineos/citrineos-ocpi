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
  OcpiConfig,
  OcpiConfigToken,
  OcpiModule,
  RabbitMqDtoReceiver,
} from '@citrineos/ocpi-base';
import { ILogObj, Logger } from 'tslog';
import { Inject, Service } from 'typedi';
import { SessionsModuleApi } from './module/SessionsModuleApi';
import { IMeterValueDto, ITransactionDto } from '@citrineos/base';
import { SessionBroadcaster } from '@citrineos/ocpi-base/dist/broadcaster/SessionBroadcaster';
import { CdrBroadcaster } from '@citrineos/ocpi-base/dist/broadcaster/CdrBroadcaster';
import { CdrMapper } from '@citrineos/ocpi-base/dist/mapper/CdrMapper';
import { Cdr } from '@citrineos/ocpi-base/dist/model/Cdr';
import { SessionMapper } from '@citrineos/ocpi-base/dist/mapper/SessionMapper';

export { SessionsModuleApi } from './module/SessionsModuleApi';
export { ISessionsModuleApi } from './module/ISessionsModuleApi';

@Service()
export class SessionsModule extends AbstractDtoModule implements OcpiModule {
  constructor(
    @Inject(OcpiConfigToken) config: OcpiConfig,
    logger: Logger<ILogObj>,
    readonly sessionBroadcaster: SessionBroadcaster,
    readonly cdrBroadcaster: CdrBroadcaster,
    readonly cdrMapper: CdrMapper,
    readonly sessionMapper: SessionMapper,
  ) {
    super(config, new RabbitMqDtoReceiver(config, logger), logger);
  }

  getController(): any {
    return SessionsModuleApi;
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
  async handleTransactionInsert(
    event: IDtoEvent<ITransactionDto>,
  ): Promise<void> {
    this._logger.info(`Handling Transaction Insert: ${JSON.stringify(event)}`);
    await this.sessionBroadcaster.broadcastPutSession(event._payload);
  }

  @AsDtoEventHandler(
    DtoEventType.UPDATE,
    DtoEventObjectType.Transaction,
    'TransactionNotification',
  )
  async handleTransactionUpdate(
    event: IDtoEvent<Partial<ITransactionDto>>,
  ): Promise<void> {
    this._logger.info(`Handling Transaction Update: ${JSON.stringify(event)}`);
    await this.sessionBroadcaster.broadcastPatchSession(event._payload);
    if (event._payload.isActive === false) {
      this._logger.info(`Transaction is no longer active: ${event._eventId}`);
      const cdrs: Cdr[] = await this.cdrMapper.mapTransactionsToCdrs([
        event._payload as ITransactionDto,
      ]);
      if (cdrs.length === 0) {
        this._logger.warn(
          `No CDRs generated for Transaction: ${event._payload.transactionId}`,
        );
        return;
      }
      if (cdrs.length > 1) {
        this._logger.warn(
          `Multiple CDRs generated for Transaction: ${event._payload.transactionId}. Only the first one will be broadcasted.`,
        );
      }
      await this.cdrBroadcaster.broadcastPostCdr(cdrs[0]);
    }
  }

  @AsDtoEventHandler(
    DtoEventType.INSERT,
    DtoEventObjectType.MeterValue,
    'MeterValueNotification',
  )
  async handleMeterValueInsert(
    event: IDtoEvent<IMeterValueDto>,
  ): Promise<void> {
    this._logger.info(`Handling Meter Value Insert: ${JSON.stringify(event)}`);
    if (event._payload.transactionDatabaseId) {
      this._logger.info(
        `Meter Value belongs to Transaction: ${event._payload.transactionDatabaseId}`,
      );
      const chargingPeriod = this.sessionMapper.getChargingPeriods(
        [event._payload],
        String(event._payload?.tariffId),
      );
      const params = {
        charging_periods: chargingPeriod,
        ...event._payload,
      };

      await this.sessionBroadcaster.broadcastPatchSessionChargingPeriod(params);
    }
  }
}
