// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { EventEmitter } from 'events';
import * as amqplib from 'amqplib';
import { Logger } from 'tslog';
import type { ILogObj } from 'tslog';
import { RabbitMqDtoReceiver } from '../receiver';
import { DtoEventObjectType, DtoEventType } from '../../types';
import type { IDtoModule } from '../../types';
import type { OcpiConfig } from '../../../config/ocpi.types';

jest.mock('amqplib', () => ({ connect: jest.fn() }));
jest.mock('@zetra/citrineos-base', () => ({
  RetryMessageError: class RetryMessageError extends Error {},
}));

type ConsumeCallback = (msg: amqplib.ConsumeMessage | null) => void;

class FakeChannel extends EventEmitter {
  readonly consumers = new Map<string, ConsumeCallback>();
  assertExchange = jest.fn().mockResolvedValue({});
  assertQueue = jest.fn().mockResolvedValue({});
  bindQueue = jest.fn().mockResolvedValue({});
  consume = jest.fn(async (queue: string, callback: ConsumeCallback) => {
    this.consumers.set(queue, callback);
    return { consumerTag: queue };
  });
  ack = jest.fn();
  nack = jest.fn();
}

class FakeChannelModel extends EventEmitter {
  readonly connection = new EventEmitter();
  readonly channel = new FakeChannel();
  private closed = false;
  createChannel = jest.fn(async () => this.channel);
  close = jest.fn(async () => {
    if (this.closed) throw new Error('Connection closed');
    this.dropConnection();
  });

  // Mirrors amqplib: channels close before the connection emits 'close'.
  dropConnection(): void {
    this.closed = true;
    this.channel.emit('close');
    this.connection.emit('close');
  }
}

const connectMock = amqplib.connect as jest.Mock;
const config = {
  messageBroker: {
    amqp: { url: 'amqp://localhost', exchange: 'citrineos-ocpi' },
  },
} as unknown as OcpiConfig;

const flush = async (): Promise<void> => {
  for (let i = 0; i < 10; i++) {
    await new Promise((resolve) => setImmediate(resolve));
  }
};

const lastConsumer = (channel: FakeChannel): ConsumeCallback =>
  [...channel.consumers.values()].at(-1) as ConsumeCallback;

const message = (body: object): amqplib.ConsumeMessage =>
  ({
    content: Buffer.from(JSON.stringify(body)),
    properties: {},
  }) as unknown as amqplib.ConsumeMessage;

describe('RabbitMqDtoReceiver', () => {
  let models: FakeChannelModel[];
  let receiver: RabbitMqDtoReceiver;
  let module: { handle: jest.Mock };

  beforeEach(async () => {
    models = [];
    connectMock.mockReset();
    connectMock.mockImplementation(async () => {
      const model = new FakeChannelModel();
      models.push(model);
      return model;
    });
    module = { handle: jest.fn().mockResolvedValue(undefined) };
    receiver = new RabbitMqDtoReceiver(
      config,
      new Logger<ILogObj>({ type: 'hidden' }),
      module as unknown as IDtoModule,
    );
    await receiver.init();
  });

  afterEach(async () => {
    await receiver.shutdown();
  });

  it('binds a transient queue with the headers filter and consumes it', async () => {
    await receiver.subscribe(DtoEventType.UPDATE, DtoEventObjectType.Evse, {
      eventId: 'EvseNotification',
    });

    const channel = models[0].channel;
    expect(channel.assertExchange).toHaveBeenCalledWith(
      'citrineos-ocpi',
      'headers',
      { durable: false },
    );
    expect(channel.assertQueue).toHaveBeenCalledWith(
      expect.stringMatching(/^rabbit_queue_/),
      { durable: false, autoDelete: true, exclusive: false },
    );
    expect(channel.bindQueue).toHaveBeenCalledWith(
      expect.any(String),
      'citrineos-ocpi',
      '',
      {
        eventType: DtoEventType.UPDATE,
        objectType: DtoEventObjectType.Evse,
        'x-match': 'all',
        eventId: 'EvseNotification',
      },
    );
    expect(channel.consumers.size).toBe(1);
  });

  it('re-subscribes every subscription after the connection is lost', async () => {
    await receiver.subscribe(DtoEventType.UPDATE, DtoEventObjectType.Evse, {
      eventId: 'EvseNotification',
    });
    await receiver.subscribe(
      DtoEventType.INSERT,
      DtoEventObjectType.Authorization,
      { eventId: 'AuthorizationNotification' },
    );

    models[0].dropConnection();
    await flush();

    expect(connectMock).toHaveBeenCalledTimes(2);
    const newChannel = models[1].channel;
    expect(newChannel.bindQueue).toHaveBeenCalledTimes(2);
    expect(newChannel.bindQueue).toHaveBeenCalledWith(
      expect.any(String),
      'citrineos-ocpi',
      '',
      expect.objectContaining({ eventId: 'AuthorizationNotification' }),
    );
    expect(newChannel.consumers.size).toBe(2);

    const delivered = message({ eventId: 'AuthorizationNotification' });
    lastConsumer(newChannel)(delivered);
    await flush();
    expect(module.handle).toHaveBeenCalledWith({
      eventId: 'AuthorizationNotification',
    });
    expect(newChannel.ack).toHaveBeenCalledWith(delivered);
  });

  it('re-declares the queue on the same channel when the broker cancels the consumer', async () => {
    await receiver.subscribe(DtoEventType.UPDATE, DtoEventObjectType.Evse, {
      eventId: 'EvseNotification',
    });
    const channel = models[0].channel;

    lastConsumer(channel)(null);
    await flush();

    expect(connectMock).toHaveBeenCalledTimes(1);
    expect(channel.assertQueue).toHaveBeenCalledTimes(2);
    expect(channel.bindQueue).toHaveBeenCalledTimes(2);
    expect(channel.consumers.size).toBe(2);
    const [firstQueue, secondQueue] = channel.assertQueue.mock.calls.map(
      ([queue]) => queue,
    );
    expect(secondQueue).not.toBe(firstQueue);
  });

  it('forces a reconnect when re-subscribing after a consumer cancel fails', async () => {
    await receiver.subscribe(DtoEventType.UPDATE, DtoEventObjectType.Evse, {
      eventId: 'EvseNotification',
    });
    const channel = models[0].channel;
    channel.bindQueue.mockRejectedValueOnce(new Error('NOT_FOUND'));

    lastConsumer(channel)(null);
    await flush();

    expect(models[0].close).toHaveBeenCalled();
    expect(connectMock).toHaveBeenCalledTimes(2);
    expect(models[1].channel.consumers.size).toBe(1);
  });

  it('ignores a consumer cancel coming from a superseded channel', async () => {
    await receiver.subscribe(DtoEventType.UPDATE, DtoEventObjectType.Evse, {
      eventId: 'EvseNotification',
    });
    const staleConsumer = lastConsumer(models[0].channel);

    models[0].dropConnection();
    await flush();
    staleConsumer(null);
    await flush();

    expect(models[0].channel.assertQueue).toHaveBeenCalledTimes(1);
    expect(models[1].channel.assertQueue).toHaveBeenCalledTimes(1);
    expect(connectMock).toHaveBeenCalledTimes(2);
  });

  it('forces a reconnect when the broker closes the channel but the connection stays up', async () => {
    await receiver.subscribe(DtoEventType.UPDATE, DtoEventObjectType.Evse, {
      eventId: 'EvseNotification',
    });

    models[0].channel.emit('close');
    await flush();

    expect(models[0].close).toHaveBeenCalled();
    expect(connectMock).toHaveBeenCalledTimes(2);
    expect(models[1].channel.consumers.size).toBe(1);
  });

  it('waits RECONNECT_DELAY between restores when the broker keeps refusing the re-subscribe', async () => {
    await receiver.subscribe(DtoEventType.UPDATE, DtoEventObjectType.Evse, {
      eventId: 'EvseNotification',
    });
    jest.useFakeTimers({ doNotFake: ['setImmediate', 'nextTick'] });
    try {
      connectMock.mockImplementation(async () => {
        const model = new FakeChannelModel();
        // Mirrors amqplib: a refused RPC closes the channel in the same tick as the rejection.
        model.channel.bindQueue.mockImplementation(async () => {
          model.channel.emit('close');
          throw new Error('ACCESS_REFUSED');
        });
        models.push(model);
        return model;
      });

      models[0].dropConnection();
      await flush();
      expect(connectMock).toHaveBeenCalledTimes(2);

      await jest.advanceTimersByTimeAsync(4000);
      await flush();
      expect(connectMock).toHaveBeenCalledTimes(2);

      await jest.advanceTimersByTimeAsync(1500);
      await flush();
      expect(connectMock).toHaveBeenCalledTimes(3);
    } finally {
      jest.useRealTimers();
    }
  });
});
