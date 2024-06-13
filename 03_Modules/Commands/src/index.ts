// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { CommandsModuleApi } from "./module/api";
import {CommandsClientApi, IOcpiModule, ResponseUrlRepository} from '@citrineos/ocpi-base';
import {
    AbstractModule, CallAction, EventGroup,
    ICache,
    IMessageHandler,
    IMessageSender,
    SystemConfig
} from "@citrineos/base";
import {ILogObj, Logger} from "tslog";
import deasyncPromise from "deasync-promise";

export { CommandsModuleApi } from './module/api';
export { ICommandsModuleApi } from './module/interface';


import {Container} from 'typedi';
import {useContainer} from 'routing-controllers';
import {MeterValue, sequelize, Transaction, SequelizeTransactionEventRepository} from "@citrineos/data";

useContainer(Container);

import { CommandsOcppHandlers } from './module/handlers';

export class CommandsModule implements IOcpiModule {
    constructor(
        config: SystemConfig,
        cache: ICache,
        handler: IMessageHandler,
        sender: IMessageSender,
        eventGroup: EventGroup,
        logger?: Logger<ILogObj>,
    ) {

        Container.set(
            AbstractModule,
            new CommandsOcppHandlers(
                config,
                cache,
                Container.get(ResponseUrlRepository),
                Container.get(CommandsClientApi),
                sender,
                handler,
                logger
            )
        );

        Container.set(
            SequelizeTransactionEventRepository,
            new SequelizeTransactionEventRepository(config, logger)
        );
    }

    getController(): any {
        return CommandsModuleApi
    }
}
