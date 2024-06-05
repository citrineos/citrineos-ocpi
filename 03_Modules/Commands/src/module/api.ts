// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { FastifyInstance, FastifyRequest } from 'fastify';
import { ILogObj, Logger } from 'tslog';
import {ICommandsModuleApi} from './interface';
import { CommandsModule } from './module';
import {
  AbstractModuleApi,
} from '@citrineos/base';

/**
 * Server API for the provisioning component.
 */
export class CommandsModuleApi
  extends AbstractModuleApi<CommandsModule>
  implements ICommandsModuleApi {
  /**
   * Constructs a new instance of the class.
   *
   * @param {CommandsModule} commandsModule - The Commands module.
   * @param {FastifyInstance} server - The Fastify server instance.
   * @param {Logger<ILogObj>} [logger] - The logger for logging.
   */
  constructor(
    commandsModule: CommandsModule,
    server: FastifyInstance,
    logger?: Logger<ILogObj>,
  ) {
    super(commandsModule, server, logger);
  }
}
