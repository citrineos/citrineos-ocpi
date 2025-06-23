// Copyright (c) 2025 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { ILogObj, Logger } from 'tslog';
import {
  DtoEventObjectType,
  DtoEventType,
  IDtoEvent,
  IDtoEventReceiver,
  IDtoEventSender,
  IDtoModule,
} from './types';
import { SystemConfig } from '@citrineos/base';

/**
 * Abstract class implementing {@link IDtoEventReceiver}.
 */
export abstract class AbstractDtoEventReceiver implements IDtoEventReceiver {
  /**
   * Fields
   */
  protected _config: SystemConfig;
  protected _module?: IDtoModule;
  protected _logger: Logger<ILogObj>;

  /**
   * Constructor
   *
   * @param config The system configuration.
   * @param logger [Optional] The logger to use.
   * @param module [Optional] The module instance.
   */
  constructor(
    config: SystemConfig,
    logger?: Logger<ILogObj>,
    module?: IDtoModule,
  ) {
    this._config = config;
    this._module = module;
    this._logger = logger
      ? logger.getSubLogger({ name: this.constructor.name })
      : new Logger<ILogObj>({ name: this.constructor.name });
  }

  /**
   * Getter & Setter
   */
  get module(): IDtoModule | undefined {
    return this._module;
  }
  set module(value: IDtoModule | undefined) {
    this._module = value;
  }

  /**
   * Methods
   */
  async handle(event: IDtoEvent): Promise<void> {
    await this._module?.handle(event);
  }

  /**
   * Abstract Methods
   */
  abstract init(): Promise<void>;

  abstract subscribe(
    mutation: DtoEventType,
    objectType: DtoEventObjectType,
    filter?: { [k: string]: string },
  ): Promise<boolean>;

  abstract shutdown(): Promise<void>;
}

/**
 * Abstract class implementing {@link IDtoEventSender}.
 */
export abstract class AbstractDtoEventSender implements IDtoEventSender {
  /**
   * Fields
   */
  protected _config: SystemConfig;
  protected _logger: Logger<ILogObj>;

  /**
   * Constructor
   *
   * @param config The system configuration.
   * @param logger [Optional] The logger to use.
   */
  constructor(config: SystemConfig, logger?: Logger<ILogObj>) {
    this._config = config;
    this._logger = logger
      ? logger.getSubLogger({ name: this.constructor.name })
      : new Logger<ILogObj>({ name: this.constructor.name });
  }

  /**
   * Abstract Methods
   */
  abstract init(): Promise<void>;

  abstract sendEvent(event: IDtoEvent): Promise<boolean>;

  abstract shutdown(): Promise<void>;
}
