// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { ILogObj, Logger } from 'tslog';
import {ICommandsModuleApi} from './interface';
import { CommandsModule } from './module';

/**
 * Server API for the provisioning component.
 */
export class CommandsModuleApi implements ICommandsModuleApi {
  /**
   * Constructs a new instance of the class.
   *
   * @param {CommandsModule} commandsModule - The Commands module.
   * @param {Logger<ILogObj>} [logger] - The logger for logging.
   */
  constructor(
    commandsModule: CommandsModule,
    // server: KoaInstance,
    logger?: Logger<ILogObj>,
  ) {

  }
}
