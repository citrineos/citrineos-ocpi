// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import * as amqplib from 'amqplib';
import type { ILogObj } from 'tslog';
import { Logger } from 'tslog';
import { RetryMessageError } from '@zetra/citrineos-base';
import type { IDtoEventReceiver, IDtoModule } from '../index.js';
import {
  AbstractDtoEventReceiver,
  DtoEventObjectType,
  DtoEventType,
} from '../index.js';
import { Inject } from 'typedi';
import type { OcpiConfig } from '../../config/ocpi.types.js';
import { OcpiConfigToken } from '../../config/ocpi.types.js';
import { logDbBroadcast } from '../../util/logging.js';

interface DtoSubscription {
  eventType: DtoEventType;
  objectType: DtoEventObjectType;
  filter: { [k: string]: string };
}

/**
 * Implementation of a {@link IEventHandler} using RabbitMQ as the underlying transport.
 */
export class RabbitMqDtoReceiver
  extends AbstractDtoEventReceiver
  implements IDtoEventReceiver
{
  /**
   * Constants
   */
  private static readonly QUEUE_PREFIX = 'rabbit_queue_';
  private static readonly RECONNECT_DELAY = 5000;

  /**
   * Fields
   */
  protected _connection?: amqplib.Connection;
  protected _channelModel?: amqplib.ChannelModel;
  protected _channel?: amqplib.Channel;
  private _reconnecting = false;
  private _abortReconnectController?: AbortController;
  // Queues are transient: the broker drops them with their connection or home node, so every
  // subscription must be replayed after a reconnect or a consumer cancel.
  private readonly _subscriptions: DtoSubscription[] = [];
  private _queueSequence = 0;
  private _lastRestoreFailureAt = 0;

  constructor(
    @Inject(OcpiConfigToken) config: OcpiConfig,
    logger?: Logger<ILogObj>,
    module?: IDtoModule,
  ) {
    super(config, logger, module);
  }

  async init(): Promise<void> {
    this._abortReconnectController = new AbortController();
    this._channel = await this._connectWithRetry(
      this._abortReconnectController.signal,
    );
  }

  /**
   * Methods
   */

  async subscribe(
    eventType: DtoEventType,
    objectType: DtoEventObjectType,
    filter?: { [k: string]: string },
  ): Promise<boolean> {
    // Ensure that filter includes the x-match header set to all
    filter = filter
      ? {
          'x-match': 'all',
          ...filter,
        }
      : { 'x-match': 'all' };
    // Add eventType and objectType to filter
    filter = { eventType, objectType, ...filter };

    if (!this._channel) {
      throw new Error('RabbitMQ is down: cannot subscribe.');
    }

    const subscription: DtoSubscription = { eventType, objectType, filter };
    await this._declareAndConsume(this._channel, subscription);
    this._subscriptions.push(subscription);

    return true;
  }

  shutdown(): Promise<void> {
    this._abortReconnectController?.abort();
    return Promise.resolve();
  }

  /**
   * Protected Methods
   */

  /**
   * Connect to RabbitMQ with retry logic.
   * This method will keep trying to connect until successful, unless aborted.
   *
   * @param {AbortSignal} [abortSignal] - Optional abort signal to stop retrying.
   * @return {Promise<amqplib.Channel>} A promise that resolves to the AMQP channel.
   */
  protected async _connectWithRetry(
    abortSignal?: AbortSignal,
  ): Promise<amqplib.Channel> {
    let reconnectAttempts = 0;
    const url = this._config.messageBroker?.amqp?.url;
    if (!url) {
      throw new Error('RabbitMQ URL is not configured');
    }
    while (!abortSignal?.aborted) {
      try {
        const connection = await amqplib.connect(url);
        this._channelModel = connection;
        this._connection = connection.connection;
        const channel = await connection.createChannel();
        channel.on('error', (err) => {
          this._logger.error('AMQP channel error', err);
        });
        // The broker can close a channel while the connection stays up; a dead channel never
        // consumes again, so rebuild everything on a fresh connection.
        channel.on('close', () => {
          // Deferred: on a connection loss the connection 'close' follows and supersedes this.
          setImmediate(() => {
            if (channel !== this._channel) return;
            this._logger.warn(
              'AMQP channel closed while connection is up. Forcing reconnect.',
            );
            this._forceReconnect(channel);
          });
        });
        this._setupConnectionListeners();
        return channel;
      } catch (err) {
        reconnectAttempts++;
        this._logger.error(
          `RabbitMQ reconnect attempt ${reconnectAttempts} failed (context: _connectWithRetry)`,
          err,
        );
        await new Promise((res) =>
          setTimeout(res, RabbitMqDtoReceiver.RECONNECT_DELAY),
        );
      }
    }
    this._logger.warn('RabbitMQ reconnect aborted by signal.');
    throw new Error('RabbitMQ reconnect aborted');
  }

  /**
   * Setup listeners for connection and channel events.
   * This will handle disconnections and errors.
   * Ensures listeners are not attached multiple times to the same connection.
   */
  private _setupConnectionListeners() {
    if (this._connection) {
      // Only attach listeners if not already attached to this connection
      if ((this._connection as any)._listenersAttached) return;
      this._connection.removeAllListeners('close');
      this._connection.removeAllListeners('error');
      this._connection.on('close', () => this._handleDisconnect());
      this._connection.on('error', () => this._handleDisconnect());
      (this._connection as any)._listenersAttached = true;
    }
  }

  /**
   * Handle RabbitMQ disconnection.
   * This method will attempt to reconnect to RabbitMQ when the connection is lost.
   * Debounces concurrent reconnects.
   */
  private async _handleDisconnect() {
    if (this._reconnecting) {
      this._logger.warn(
        'RabbitMQ reconnect already in progress, skipping duplicate reconnect.',
      );
      return;
    }
    this._reconnecting = true;
    this._abortReconnectController?.abort();
    this._abortReconnectController = new AbortController();

    this._logger.warn('RabbitMQ connection lost. Attempting to reconnect...');
    this._channel = undefined;
    this._connection = undefined;
    this._channelModel = undefined;
    let channel: amqplib.Channel | undefined;
    let restored = false;
    try {
      // A refused declare closes the channel in the same tick, whose handler lands back here at
      // once: wait out the delay since the last failed restore, or it becomes a reconnect storm.
      const wait =
        this._lastRestoreFailureAt +
        RabbitMqDtoReceiver.RECONNECT_DELAY -
        Date.now();
      if (wait > 0) {
        await new Promise((resolve) => setTimeout(resolve, wait));
      }
      channel = await this._connectWithRetry(
        this._abortReconnectController.signal,
      );
      this._channel = channel;
      await this._resubscribeAll(channel);
      restored = true;
      this._lastRestoreFailureAt = 0;
      this._logger.info(
        `RabbitMQ reconnected successfully, ${this._subscriptions.length} subscription(s) restored.`,
      );
    } catch (err) {
      this._lastRestoreFailureAt = Date.now();
      this._logger.error(
        'Failed to reconnect or re-subscribe to RabbitMQ (context: _handleDisconnect)',
        err,
      );
    } finally {
      this._reconnecting = false;
    }
    // Close events fired while re-subscribing were skipped by the guard above: start over,
    // after a delay so a persistent broker error does not turn into a tight reconnect loop.
    if (!restored && channel) {
      const failedChannel = channel;
      setTimeout(
        () => this._forceReconnect(failedChannel),
        RabbitMqDtoReceiver.RECONNECT_DELAY,
      );
    }
  }

  /**
   * Declares a fresh transient queue for `subscription`, binds it and starts consuming.
   */
  private async _declareAndConsume(
    channel: amqplib.Channel,
    subscription: DtoSubscription,
  ): Promise<void> {
    const exchange = this._config.messageBroker?.amqp?.exchange as string;
    // The sequence keeps names unique when several subscriptions are replayed in the same ms.
    const queueName = `${RabbitMqDtoReceiver.QUEUE_PREFIX}${subscription.eventType}_${subscription.objectType}_${Date.now()}_${++this._queueSequence}`;

    await channel.assertExchange(exchange, 'headers', { durable: false });
    await channel.assertQueue(queueName, {
      durable: false,
      autoDelete: true,
      exclusive: false,
    });

    this._logger.debug(
      `Bind ${queueName} on ${exchange} with filter ${JSON.stringify(subscription.filter)}.`,
    );
    await channel.bindQueue(queueName, exchange, '', subscription.filter);

    await channel.consume(queueName, (msg) => {
      // amqplib signals a broker-side basic.cancel (queue deleted) with a null message.
      if (msg === null) {
        this._onConsumerCancelled(channel, subscription);
        return;
      }
      void this._onEvent(msg, channel);
    });
  }

  private async _resubscribeAll(channel: amqplib.Channel): Promise<void> {
    for (const subscription of this._subscriptions) {
      await this._declareAndConsume(channel, subscription);
    }
  }

  /**
   * Restores a subscription whose queue was deleted by the broker, e.g. when the RabbitMQ node
   * hosting it goes down while our connection lives on another node: no reconnect happens, so
   * without this the receiver silently stops consuming.
   */
  private _onConsumerCancelled(
    channel: amqplib.Channel,
    subscription: DtoSubscription,
  ): void {
    if (channel !== this._channel) {
      // Superseded channel: the reconnect that replaced it re-subscribed everything.
      return;
    }
    const label = `${subscription.eventType} ${subscription.objectType} ${subscription.filter.eventId ?? ''}`;
    this._logger.warn(
      `RabbitMQ cancelled the consumer for ${label} (queue deleted by the broker). Re-subscribing.`,
    );
    this._declareAndConsume(channel, subscription)
      .then(() =>
        this._logger.info(`Re-subscribed ${label} after consumer cancel.`),
      )
      .catch((error) => {
        this._logger.error(
          `Failed to re-subscribe ${label} after consumer cancel. Forcing reconnect.`,
          error,
        );
        this._forceReconnect(channel);
      });
  }

  /**
   * Closes the current connection so that {@link _handleDisconnect} reconnects and re-subscribes
   * everything. No-op if `channel` has already been superseded.
   */
  private _forceReconnect(channel: amqplib.Channel): void {
    const channelModel = this._channelModel;
    if (channel !== this._channel || !channelModel) {
      return;
    }
    Promise.resolve()
      .then(() => channelModel.close())
      .catch((error) => {
        this._logger.warn(
          'Closing RabbitMQ connection failed, handling as disconnect.',
          error,
        );
        if (this._channelModel === channelModel) {
          void this._handleDisconnect();
        }
      });
  }

  /**
   * Underlying RabbitMQ message handler.
   *
   * @param message The AMQPMessage to process
   * @param channel
   */
  protected async _onEvent(
    message: amqplib.ConsumeMessage | null,
    channel: amqplib.Channel,
  ): Promise<void> {
    if (message) {
      try {
        logDbBroadcast(
          this._logger,
          'debug',
          '_onEvent:Received message:',
          message.properties,
          message.content.toString(),
        );
        const parsed = JSON.parse(message.content.toString());
        await this.handle(parsed);
      } catch (error) {
        if (error instanceof RetryMessageError) {
          this._logger.warn('Retrying message: ', error.message);
          // Retryable error, usually ongoing call with station when trying to send new call
          channel.nack(message);
          return;
        } else {
          this._logger.error('Error while processing message:', error, message);
        }
      }
      channel.ack(message);
    }
  }
}
