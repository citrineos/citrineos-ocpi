// Copyright (c) 2025 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { SystemConfig } from '@citrineos/base';
import {
  DtoEventObjectType,
  DtoEventType,
  IDtoEventSubscriber,
  IDtoEventSender,
  IDtoRouter,
} from './types';
import { ILogObj, Logger } from 'tslog';

export abstract class AbstractDtoRouter implements IDtoRouter {
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

  subscribe(
    eventId: string,
    eventType: DtoEventType,
    objectType: DtoEventObjectType,
  ): Promise<boolean> {
    throw new Error('Method not implemented.');
  }
}
