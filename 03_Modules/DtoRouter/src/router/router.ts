// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { SystemConfig } from '@citrineos/base';
import {
  DtoEvent,
  DtoEventObjectType,
  DtoEventType,
  IDtoEventSender,
  IDtoEventSubscriber,
  IDtoPayload,
  IDtoRouter,
} from '@citrineos/ocpi-base';
import { Logger, ILogObj } from 'tslog';

export class DtoRouter implements IDtoRouter {
  protected _config: SystemConfig;
  protected readonly _sender: IDtoEventSender;
  protected _subscriber: IDtoEventSubscriber;
  protected readonly _logger: Logger<ILogObj>;

  constructor(
    config: SystemConfig,
    sender: IDtoEventSender,
    subscriber: IDtoEventSubscriber,
    logger?: Logger<ILogObj>,
  ) {
    this._logger = logger
      ? logger.getSubLogger({ name: this.constructor.name })
      : new Logger<ILogObj>({ name: this.constructor.name });
    this._config = config;
    this._sender = sender;
    this._subscriber = subscriber;
  }

  async init(): Promise<void> {
    await this._sender.init();
    await this._subscriber.init();
  }

  /**
   * Getters & Setters
   */
  get subscriber(): IDtoEventSubscriber {
    return this._subscriber;
  }

  get sender(): IDtoEventSender {
    return this._sender;
  }

  async shutdown(): Promise<void> {
    this._subscriber.shutdown();
    this._sender.shutdown();
  }

  async subscribe<T extends IDtoPayload>(
    eventId: string,
    eventType: DtoEventType,
    objectType: DtoEventObjectType,
  ): Promise<boolean> {
    this._subscriber.subscribe(
      eventId,
      async (event: { eventType: DtoEventType; payload: T }) => {
        this._logger.info(
          `${eventId} received event for eventType ${eventType} and objectType ${objectType}: ${JSON.stringify(event)}`,
        );
        const dtoEvent = new DtoEvent(
          eventId,
          { eventType, objectType },
          event.payload,
        );

        await this._sender.sendEvent(dtoEvent);
      },
      (error) => {
        this._logger.error(
          `${eventId} received error for eventType ${eventType} and objectType ${objectType}: ${error.message}`,
        );
      },
      () => {},
    );
    return true;
  }
}
