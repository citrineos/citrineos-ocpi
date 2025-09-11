// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import {
  AbstractDtoModule,
  AsDtoEventHandler,
  CdrBroadcaster,
  CdrMapper,
  DtoEventObjectType,
  DtoEventType,
  GET_TRANSACTION_BY_TRANSACTION_ID_QUERY,
  GetTransactionByTransactionIdQueryResult,
  GetTransactionByTransactionIdQueryVariables,
  IDtoEvent,
  OcpiConfig,
  OcpiConfigToken,
  OcpiGraphqlClient,
  OcpiModule,
  RabbitMqDtoReceiver,
  SessionBroadcaster,
  SessionMapper,
} from '@citrineos/ocpi-base';
import { ILogObj, Logger } from 'tslog';
import { Inject, Service } from 'typedi';
import { SessionsModuleApi } from './module/SessionsModuleApi';
import { IMeterValueDto, ITransactionDto } from '@citrineos/base';
import { Cdr } from '@citrineos/ocpi-base/src/model/Cdr';

export { SessionsModuleApi } from './module/SessionsModuleApi';
export { ISessionsModuleApi } from './module/ISessionsModuleApi';

@Service()
export class SessionsModule extends AbstractDtoModule implements OcpiModule {
  constructor(
    @Inject(OcpiConfigToken) config: OcpiConfig,
    logger: Logger<ILogObj>,
    readonly ocpiGraphqlClient: OcpiGraphqlClient,
    readonly sessionBroadcaster: SessionBroadcaster,
    readonly cdrBroadcaster: CdrBroadcaster,
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
    this._logger.debug(`Handling Transaction Insert: ${JSON.stringify(event)}`);
    const transactionDto = event._payload;
    const tenant = transactionDto.tenant;
    if (!tenant) {
      this._logger.error(
        `Tenant data missing in ${event._context.eventType} notification for ${event._context.objectType} ${transactionDto.id}, cannot broadcast.`,
      );
      return;
    }
    await this.sessionBroadcaster.broadcastPutSession(tenant, transactionDto);
  }

  @AsDtoEventHandler(
    DtoEventType.UPDATE,
    DtoEventObjectType.Transaction,
    'TransactionNotification',
  )
  async handleTransactionUpdate(
    event: IDtoEvent<Partial<ITransactionDto>>,
  ): Promise<void> {
    this._logger.debug(`Handling Transaction Update: ${JSON.stringify(event)}`);
    const transactionDto = event._payload;
    const tenant = transactionDto.tenant;
    if (!tenant) {
      this._logger.error(
        `Tenant data missing in ${event._context.eventType} notification for ${event._context.objectType} ${transactionDto.id}, cannot broadcast.`,
      );
      return;
    }
    await this.sessionBroadcaster.broadcastPatchSession(tenant, transactionDto);
    if (transactionDto.isActive === false) {
      this._logger.debug(`Transaction is no longer active: ${event._eventId}`);

      const fullTransactionDtoResponse = await this.ocpiGraphqlClient.request<
        GetTransactionByTransactionIdQueryResult,
        GetTransactionByTransactionIdQueryVariables
      >(GET_TRANSACTION_BY_TRANSACTION_ID_QUERY, {
        transactionId: transactionDto.transactionId!,
      });

      if (!fullTransactionDtoResponse.Transactions[0]) {
        this._logger.error(
          `Full Transaction DTO not found for ID ${transactionDto.transactionId}, cannot broadcast.`,
        );
        return;
      }

      const fullTransactionDto = fullTransactionDtoResponse
        .Transactions[0] as ITransactionDto;
      await this.cdrBroadcaster.broadcastPostCdr(fullTransactionDto);
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
    this._logger.debug(`Handling Meter Value Insert: ${JSON.stringify(event)}`);
    const meterValueDto = event._payload;
    const tenant = meterValueDto.tenant;
    if (!tenant) {
      this._logger.error(
        `Tenant data missing in ${event._context.eventType} notification for ${event._context.objectType} ${meterValueDto.id}, cannot broadcast.`,
      );
      return;
    }
    if (meterValueDto.transactionDatabaseId) {
      this._logger.debug(
        `Meter Value belongs to Transaction: ${meterValueDto.transactionDatabaseId}`,
      );
      if (!meterValueDto.tariffId) {
        this._logger.error(
          `Tariff ID missing in Meter Value notification for Transaction ${meterValueDto.transactionDatabaseId}, cannot broadcast.`,
        );
        return;
      }

      await this.sessionBroadcaster.broadcastPatchSessionChargingPeriod(
        tenant,
        meterValueDto,
      );
    }
  }
}
