// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0
import type {
  GetTransactionByTransactionIdQueryResult,
  GetTransactionByTransactionIdQueryVariables,
  IDtoEvent,
  OcpiConfig,
} from '@citrineos/ocpi-base';

import {
  AbstractDtoModule,
  AsDtoEventHandler,
  CdrBroadcaster,
  DtoEventObjectType,
  DtoEventType,
  GET_TRANSACTION_BY_TRANSACTION_ID_QUERY,
  OcpiConfigToken,
  OcpiGraphqlClient,
  OcpiModule,
  RabbitMqDtoReceiver,
  SessionBroadcaster,
} from '@citrineos/ocpi-base';
import type { ILogObj } from 'tslog';
import { Logger } from 'tslog';
import { Inject, Service } from 'typedi';
import { SessionsModuleApi } from './module/SessionsModuleApi.js';
import type { MeterValueDto, TransactionDto } from '@zetra/citrineos-base';
import { logDbBroadcast } from '@citrineos/ocpi-base';
export { SessionsModuleApi } from './module/SessionsModuleApi.js';
export type { ISessionsModuleApi } from './module/ISessionsModuleApi.js';

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
    event: IDtoEvent<TransactionDto>,
  ): Promise<void> {
    // logDbBroadcast(
    //   this._logger,
    //   'debug',
    //   'Handling Transaction Insert:',
    //   event,
    // );
    const transactionDto = event._payload;
    const transaction = await this.ocpiGraphqlClient.request<
      GetTransactionByTransactionIdQueryResult,
      GetTransactionByTransactionIdQueryVariables
    >(GET_TRANSACTION_BY_TRANSACTION_ID_QUERY, {
      transactionId: transactionDto.transactionId!,
    });
    if (!transaction.Transactions[0]) {
      this._logger.error(
        `Transaction not found for ID ${transactionDto.transactionId}, cannot broadcast.`,
      );
      return;
    }
    console.log('\n\ntransactionDto INSERT!!!', transactionDto);
    console.log('\n\ntransaction INSERT!!!', transaction);
    const tenant = transactionDto.tenant;

    await this.sessionBroadcaster.broadcastPutSession(
      tenant!,
      transaction.Transactions[0] as TransactionDto,
      transaction.Transactions[0].authorization?.tenantPartner?.id,
    );
  }

  @AsDtoEventHandler(
    DtoEventType.UPDATE,
    DtoEventObjectType.Transaction,
    'TransactionNotification',
  )
  async handleTransactionUpdate(
    event: IDtoEvent<Partial<TransactionDto>>,
  ): Promise<void> {
    console.log('\n\nhandleTransaction UPDATe!!!', event);
    logDbBroadcast(
      this._logger,
      'debug',
      'Handling Transaction Update:',
      event,
    );
    const transactionDto = event._payload;
    // const isEnd = transactionDto.isActive === false;
    const hasMeterProgress =
      transactionDto.totalKwh !== undefined ||
      transactionDto.meterStart !== undefined;

    const fullTransactionDtoResponse = await this.ocpiGraphqlClient.request<
      GetTransactionByTransactionIdQueryResult,
      GetTransactionByTransactionIdQueryVariables
    >(GET_TRANSACTION_BY_TRANSACTION_ID_QUERY, {
      transactionId: transactionDto.transactionId!,
    });

    const fullTx = fullTransactionDtoResponse.Transactions[0];
    const isEnd =
      transactionDto.isActive === false || fullTx.isActive === false;
    console.log('isEnd!!!', isEnd);

    const hasChargingStateChange = transactionDto.chargingState !== undefined;
    console.log('hasChargingStateChange!!!', hasChargingStateChange);

    console.log('transactionDto.isActive', transactionDto.isActive);
    console.log('fullTx.isActive', fullTx.isActive);
    console.log('\n\nisEnd!!!', isEnd);
    if (!isEnd && !hasMeterProgress && !hasChargingStateChange) {
      this._logger.info(
        `Transaction is not end and has no meter progress: ${event._eventId}`,
      );
      return; // chargingState-only — don't PATCH
    }
    if (!fullTransactionDtoResponse.Transactions[0]) {
      this._logger.error(
        `Full Transaction DTO not found for ID ${transactionDto.transactionId}, cannot broadcast.`,
      );
      return;
    }
    const fullTransaction = {
      ...fullTransactionDtoResponse.Transactions[0],
      ...transactionDto,
    } as TransactionDto;

    console.log('\n\nfullTransaction CHNGED!!!', fullTransaction);
    const tenant = transactionDto.tenant;
    // if (fullTransaction.meterValues && fullTransaction.meterValues.length > 1) {
    await this.sessionBroadcaster.broadcastPatchSession(
      tenant!,
      fullTransaction,
      fullTransactionDtoResponse.Transactions[0].authorization?.tenantPartner
        ?.id,
    );
    // }
    if (transactionDto.isActive === false) {
      this._logger.info(`Transaction is no longer active: ${event._eventId}`);

      const fullTransactionDto = fullTransactionDtoResponse
        .Transactions[0] as TransactionDto;
      await this.cdrBroadcaster.broadcastPostCdr(fullTransactionDto);

      this.sessionBroadcaster.clearSessionBroadcastDedupe(
        transactionDto.transactionId!,
      );
    }
  }

  // @AsDtoEventHandler(
  //   DtoEventType.INSERT,
  //   DtoEventObjectType.MeterValue,
  //   'MeterValueNotification',
  // )
  // async handleMeterValueInsert(event: IDtoEvent<MeterValueDto>): Promise<void> {
  //   logDbBroadcast(
  //     this._logger,
  //     'debug',
  //     'Handling Meter Value Insert:',
  //     event,
  //   );
  //   const meterValueDto = event._payload;
  //   const tenant = meterValueDto.tenant;
  //   if (meterValueDto.transactionDatabaseId) {
  //     const fullTransactionDtoResponse = await this.ocpiGraphqlClient.request<
  //       GetTransactionByTransactionIdQueryResult,
  //       GetTransactionByTransactionIdQueryVariables
  //     >(GET_TRANSACTION_BY_TRANSACTION_ID_QUERY, {
  //       transactionId: meterValueDto.transactionId!,
  //     });
  //     this._logger.debug(
  //       `Meter Value belongs to Transaction: ${meterValueDto.transactionDatabaseId}`,
  //     );
  //     if (!meterValueDto.tariffId) {
  //       this._logger.error(
  //         `Tariff ID missing in Meter Value notification for Transaction ${meterValueDto.transactionDatabaseId}, cannot broadcast.`,
  //       );
  //       return;
  //     }

  //     if (!fullTransactionDtoResponse.Transactions[0]) {
  //       this._logger.error(
  //         `Transaction not found for meter value ${meterValueDto.transactionDatabaseId}, cannot broadcast.`,
  //       );
  //       return;
  //     }

  //     await this.sessionBroadcaster.broadcastPatchSessionChargingPeriod(
  //       tenant!,
  //       meterValueDto,
  //       fullTransactionDtoResponse.Transactions[0].authorization?.tenantPartner
  //         ?.id,
  //     );
  //   }
  // }
}
