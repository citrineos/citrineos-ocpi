// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { CommandsModuleApi } from "./module/api";
import {IOcpiModule} from '@citrineos/ocpi-base';
import {
    AbstractModule, CallAction, EventGroup,
    ICache,
    IMessageHandler,
    IMessageSender,
    SystemConfig
} from "../../../../citrineos-core/00_Base";
import {ILogObj, Logger} from "tslog";
import deasyncPromise from "deasync-promise";

export { CommandsModuleApi } from './module/api';
export { ICommandsModuleApi } from './module/interface';


import {Container} from 'typedi';
import {useContainer} from 'routing-controllers';
import {sequelize} from "@citrineos/data";

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
        new CommandsOcppHandlers(
            config,
            cache,
            sender,
            handler,
            logger
        );
    }

    getController(): any {
        return CommandsModuleApi
    }
}
