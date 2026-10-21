// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import 'reflect-metadata';

jest.mock('../module/TariffsModuleApi.js', () => ({
  TariffsModuleApi: class TariffsModuleApiStub {},
}));

import type { IDtoEvent, OcpiConfig } from '@citrineos/ocpi-base';
import { DtoEventObjectType, DtoEventType } from '@citrineos/ocpi-base';
import type { TariffDto } from '@zetra/citrineos-base';
import { Logger } from 'tslog';
import { Token } from 'typedi';
import { TariffsModule } from '../index.js';

jest.mock('@citrineos/ocpi-base', () => {
  const AS_DTO_EVENT_HANDLER_METADATA = 'AS_DTO_EVENT_HANDLER_METADATA';
  const { Token: TypediToken } = require('typedi') as {
    Token: typeof Token;
  };
  const OcpiConfigToken = new TypediToken('ocpi.config');

  const DtoEventType = {
    INSERT: 'INSERT',
    UPDATE: 'UPDATE',
    DELETE: 'DELETE',
  };
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
    eventType: (typeof DtoEventType)[keyof typeof DtoEventType],
    objectType: (typeof DtoEventObjectType)[keyof typeof DtoEventObjectType],
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
      ) as Array<{
        eventType: string;
        objectType: string;
        eventId: string;
        methodName: string;
        method: (...args: unknown[]) => unknown;
      }>;
      handlers.push({
        eventType,
        objectType,
        eventId,
        methodName: propertyKey,
        method: descriptor.value as (...args: unknown[]) => unknown,
      });
      Reflect.defineMetadata(
        AS_DTO_EVENT_HANDLER_METADATA,
        handlers,
        (target as { constructor: object }).constructor,
      );
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

  class TariffsBroadcaster {}

  return {
    AbstractDtoModule,
    AsDtoEventHandler,
    DtoEventObjectType,
    DtoEventType,
    OcpiConfigToken,
    OcpiModule,
    RabbitMqDtoReceiver,
    TariffsBroadcaster,
    logDbBroadcast: jest.fn(),
  };
});

function makeEvent<P extends TariffDto | Partial<TariffDto>>(
  payload: P,
): IDtoEvent<P> {
  return {
    _eventId: 'e1',
    _context: {
      eventType: DtoEventType.INSERT,
      objectType: DtoEventObjectType.Tariff,
    },
    _payload: payload,
  };
}

describe('TariffsModule broadcast skip for partner-received tariffs', () => {
  const tenant: TariffDto['tenant'] = {
    name: 'T',
    countryCode: 'FR',
    partyId: 'ZTA',
    isUserTenant: true,
  };

  const ownTariff: TariffDto = {
    id: 1,
    currency: 'EUR',
    tenant,
  };

  const partnerTariff: TariffDto & { tenantPartnerId: number } = {
    ...ownTariff,
    tenantPartnerId: 15,
  };

  let mod: TariffsModule;
  let broadcastPut: jest.Mock;
  let broadcastDelete: jest.Mock;

  beforeEach(() => {
    broadcastPut = jest.fn().mockResolvedValue(undefined);
    broadcastDelete = jest.fn().mockResolvedValue(undefined);
    const broadcaster = {
      broadcastPutTariff: broadcastPut,
      broadcastTariffDeletion: broadcastDelete,
    };
    mod = new TariffsModule(
      {} as OcpiConfig,
      new Logger({ type: 'hidden' }),
      broadcaster as never,
    );
  });

  it('does not call broadcastPutTariff on INSERT when tenantPartnerId is set', async () => {
    await mod.handleTariffInsert(makeEvent(partnerTariff));
    expect(broadcastPut).not.toHaveBeenCalled();
  });

  it('calls broadcastPutTariff on INSERT when tariff is own (no tenantPartnerId)', async () => {
    await mod.handleTariffInsert(makeEvent(ownTariff));
    expect(broadcastPut).toHaveBeenCalledTimes(1);
    expect(broadcastPut).toHaveBeenCalledWith(tenant, ownTariff);
  });

  it('does not call broadcastPutTariff on UPDATE when tenantPartnerId is set', async () => {
    await mod.handleTariffUpdate(makeEvent(partnerTariff));
    expect(broadcastPut).not.toHaveBeenCalled();
  });

  it('does not call broadcastTariffDeletion on DELETE when tenantPartnerId is set', async () => {
    await mod.handleTariffDelete(makeEvent(partnerTariff));
    expect(broadcastDelete).not.toHaveBeenCalled();
  });

  it('calls broadcastTariffDeletion on DELETE for own tariff', async () => {
    await mod.handleTariffDelete(makeEvent(ownTariff));
    expect(broadcastDelete).toHaveBeenCalledTimes(1);
    expect(broadcastDelete).toHaveBeenCalledWith(tenant, ownTariff);
  });
});
