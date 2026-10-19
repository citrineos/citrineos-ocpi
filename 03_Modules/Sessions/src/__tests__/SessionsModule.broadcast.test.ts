// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import 'reflect-metadata';

jest.mock('../module/SessionsModuleApi.js', () => ({
  SessionsModuleApi: class SessionsModuleApiStub {},
}));

import type { IDtoEvent, OcpiConfig } from '@citrineos/ocpi-base';
import { DtoEventObjectType, DtoEventType } from '@citrineos/ocpi-base';
import type { TransactionDto } from '@zetra/citrineos-base';
import { Logger } from 'tslog';
import { Token } from 'typedi';
import { SessionsModule } from '../index.js';

jest.mock('@citrineos/ocpi-base', () => {
  const AS_DTO_EVENT_HANDLER_METADATA = 'AS_DTO_EVENT_HANDLER_METADATA';
  const { Token: TypediToken } = require('typedi') as { Token: typeof Token };
  const OcpiConfigToken = new TypediToken('ocpi.config');

  const DtoEventType = { INSERT: 'INSERT', UPDATE: 'UPDATE', DELETE: 'DELETE' };
  const DtoEventObjectType = {
    Location: 'Location',
    ChargingStation: 'ChargingStation',
    Evse: 'Evse',
    Connector: 'Connector',
    Transaction: 'Transaction',
    MeterValue: 'MeterValue',
    Tariff: 'Tariff',
  };

  const AsDtoEventHandler = function (
    eventType: string,
    objectType: string,
    eventId: string,
  ) {
    return function (
      target: object,
      propertyKey: string,
      descriptor: PropertyDescriptor,
    ): PropertyDescriptor {
      if (
        !Reflect.hasMetadata(
          AS_DTO_EVENT_HANDLER_METADATA,
          (target as { constructor: object }).constructor,
        )
      ) {
        Reflect.defineMetadata(
          AS_DTO_EVENT_HANDLER_METADATA,
          [],
          (target as { constructor: object }).constructor,
        );
      }
      const handlers = Reflect.getMetadata(
        AS_DTO_EVENT_HANDLER_METADATA,
        (target as { constructor: object }).constructor,
      ) as Array<Record<string, unknown>>;
      handlers.push({
        eventType,
        objectType,
        eventId,
        methodName: propertyKey,
      });
      return descriptor;
    };
  };

  class AbstractDtoModule {
    protected _config: unknown;
    protected _receiver: {
      module?: unknown;
      init: () => Promise<void>;
      shutdown: () => Promise<void>;
    };
    protected _logger: unknown;
    constructor(
      config: unknown,
      receiver: AbstractDtoModule['_receiver'],
      logger?: unknown,
    ) {
      this._config = config;
      this._receiver = receiver;
      this._logger = logger;
      receiver.module = this;
    }
    get receiver() {
      return this._receiver;
    }
    async shutdown(): Promise<void> {
      await this._receiver.shutdown();
    }
  }

  class RabbitMqDtoReceiver {
    init = jest.fn().mockResolvedValue(undefined);
    shutdown = jest.fn().mockResolvedValue(undefined);
    module: unknown;
    subscribe = jest.fn().mockResolvedValue(true);
    handle = jest.fn();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(_config: unknown, _logger: unknown) {}
  }

  abstract class OcpiModule {
    abstract getController(): unknown;
  }

  class SessionBroadcaster {}
  class CdrBroadcaster {}
  class OcpiGraphqlClient {}

  return {
    AbstractDtoModule,
    AsDtoEventHandler,
    DtoEventObjectType,
    DtoEventType,
    OcpiConfigToken,
    OcpiModule,
    RabbitMqDtoReceiver,
    SessionBroadcaster,
    CdrBroadcaster,
    OcpiGraphqlClient,
    GET_TRANSACTION_BY_TRANSACTION_ID_QUERY:
      'GET_TRANSACTION_BY_TRANSACTION_ID_QUERY',
    logDbBroadcast: jest.fn(),
  };
});

function makeEvent<P extends TransactionDto | Partial<TransactionDto>>(
  payload: P,
  eventType: DtoEventType = DtoEventType.INSERT,
): IDtoEvent<P> {
  return {
    _eventId: 'e1',
    _context: { eventType, objectType: DtoEventObjectType.Transaction },
    _payload: payload,
  };
}

describe('SessionsModule broadcast wiring', () => {
  const tenant: TransactionDto['tenant'] = {
    name: 'T',
    countryCode: 'FR',
    partyId: 'ZET',
  } as TransactionDto['tenant'];

  const baseTransaction = {
    transactionId: 'tx-1',
    tenant,
    isActive: true,
    authorization: { tenantPartner: { id: 42 } },
  } as TransactionDto;

  let mod: SessionsModule;
  let mockOcpiGraphqlClient: { request: jest.Mock };
  let broadcastPutSession: jest.Mock;
  let broadcastPatchSession: jest.Mock;
  let clearDedupe: jest.Mock;
  let broadcastPostCdr: jest.Mock;

  beforeEach(() => {
    mockOcpiGraphqlClient = { request: jest.fn() };
    broadcastPutSession = jest.fn().mockResolvedValue(undefined);
    broadcastPatchSession = jest.fn().mockResolvedValue(undefined);
    clearDedupe = jest.fn();
    broadcastPostCdr = jest.fn().mockResolvedValue(undefined);

    const sessionBroadcaster = {
      broadcastPutSession,
      broadcastPatchSession,
      clearSessionBroadcastDedupe: clearDedupe,
    };
    const cdrBroadcaster = { broadcastPostCdr };

    mod = new SessionsModule(
      {} as OcpiConfig,
      new Logger({ type: 'hidden' }),
      mockOcpiGraphqlClient as never,
      sessionBroadcaster as never,
      cdrBroadcaster as never,
    );
  });

  describe('handleTransactionInsert', () => {
    it('fetches the full transaction and calls broadcastPutSession', async () => {
      mockOcpiGraphqlClient.request.mockResolvedValueOnce({
        Transactions: [baseTransaction],
      });

      await mod.handleTransactionInsert(
        makeEvent(baseTransaction, DtoEventType.INSERT),
      );

      expect(broadcastPutSession).toHaveBeenCalledWith(
        tenant,
        baseTransaction,
        42,
      );
    });

    it('does nothing when the transaction cannot be found', async () => {
      mockOcpiGraphqlClient.request.mockResolvedValueOnce({ Transactions: [] });

      await mod.handleTransactionInsert(
        makeEvent(baseTransaction, DtoEventType.INSERT),
      );

      expect(broadcastPutSession).not.toHaveBeenCalled();
    });
  });

  describe('handleTransactionUpdate', () => {
    it('skips the broadcast for a chargingState-only update with no meter progress', async () => {
      const partial = {
        transactionId: 'tx-1',
        tenant,
        chargingState: 'Charging',
      } as Partial<TransactionDto>;
      mockOcpiGraphqlClient.request.mockResolvedValueOnce({
        Transactions: [{ ...baseTransaction, isActive: true }],
      });

      await mod.handleTransactionUpdate(
        makeEvent(partial, DtoEventType.UPDATE),
      );

      expect(broadcastPatchSession).not.toHaveBeenCalled();
    });

    it('broadcasts a PATCH when meter progress is present', async () => {
      const partial = {
        transactionId: 'tx-1',
        tenant,
        totalKwh: 5,
      } as Partial<TransactionDto>;
      mockOcpiGraphqlClient.request.mockResolvedValueOnce({
        Transactions: [{ ...baseTransaction, isActive: true }],
      });

      await mod.handleTransactionUpdate(
        makeEvent(partial, DtoEventType.UPDATE),
      );

      expect(broadcastPatchSession).toHaveBeenCalledTimes(1);
      expect(broadcastPostCdr).not.toHaveBeenCalled();
      expect(clearDedupe).not.toHaveBeenCalled();
    });

    it('on session end: broadcasts PATCH, then triggers CDR broadcast and clears dedupe', async () => {
      const partial = {
        transactionId: 'tx-1',
        tenant,
        isActive: false,
      } as Partial<TransactionDto>;
      const fullTx = { ...baseTransaction, isActive: false };
      mockOcpiGraphqlClient.request.mockResolvedValueOnce({
        Transactions: [fullTx],
      });

      await mod.handleTransactionUpdate(
        makeEvent(partial, DtoEventType.UPDATE),
      );

      expect(broadcastPatchSession).toHaveBeenCalledTimes(1);
      expect(broadcastPostCdr).toHaveBeenCalledWith(fullTx);
      expect(clearDedupe).toHaveBeenCalledWith('tx-1');
    });
  });
});
