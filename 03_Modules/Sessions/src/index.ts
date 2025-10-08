// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import {
  AbstractDtoModule,
  AsDtoEventHandler,
  CdrBroadcaster,
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
} from '@citrineos/ocpi-base';
import { ILogObj, Logger } from 'tslog';
import { Inject, Service } from 'typedi';
import { SessionsModuleApi } from './module/SessionsModuleApi';
import { IMeterValueDto, ITransactionDto } from '@citrineos/base';

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

  /**
   * Checks if a meter value is a Transaction.Begin meter value by comparing timestamps
   */
  private async isTransactionBeginMeterValue(
    meterValueDto: IMeterValueDto,
  ): Promise<boolean> {
    try {
      // Fetch the transaction to get its start time
      const transactionResponse = await this.ocpiGraphqlClient.request<
        GetTransactionByTransactionIdQueryResult,
        GetTransactionByTransactionIdQueryVariables
      >(GET_TRANSACTION_BY_TRANSACTION_ID_QUERY, {
        transactionId: meterValueDto.transactionId!,
      });

      if (!transactionResponse.Transactions[0]) {
        this._logger.warn(
          `Transaction not found for meter value ${meterValueDto.id}`,
        );
        return false;
      }

      const transaction = transactionResponse.Transactions[0];
      const transactionStartTime = new Date(transaction.startTime);
      const meterValueTime = new Date(meterValueDto.timestamp);

      // Consider it a Transaction.Begin meter value if it's within 1 second of transaction start
      const timeDiffMs = Math.abs(
        meterValueTime.getTime() - transactionStartTime.getTime(),
      );
      return timeDiffMs <= 1000; // 1 second tolerance
    } catch (error) {
      this._logger.error(
        `Error checking if meter value is Transaction.Begin: ${error}`,
      );
      return false;
    }
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

    // Fetch the full transaction with meter values to include Transaction.Begin meter values in the initial PUT
    const fullTransactionResponse = await this.ocpiGraphqlClient.request<
      GetTransactionByTransactionIdQueryResult,
      GetTransactionByTransactionIdQueryVariables
    >(GET_TRANSACTION_BY_TRANSACTION_ID_QUERY, {
      transactionId: transactionDto.transactionId!,
    });

    if (fullTransactionResponse.Transactions[0]) {
      const fullTransactionDto = fullTransactionResponse
        .Transactions[0] as ITransactionDto;
      await this.sessionBroadcaster.broadcastPutSession(
        tenant,
        fullTransactionDto,
      );
    } else {
      // Fallback to original transaction if full fetch fails
      await this.sessionBroadcaster.broadcastPutSession(tenant, transactionDto);
    }
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

      // Skip Transaction.Begin meter values to prevent race condition
      const isTransactionBegin =
        await this.isTransactionBeginMeterValue(meterValueDto);
      if (isTransactionBegin) {
        this._logger.debug(
          `Skipping Transaction.Begin meter value for Transaction ${meterValueDto.transactionDatabaseId} to prevent race condition`,
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
