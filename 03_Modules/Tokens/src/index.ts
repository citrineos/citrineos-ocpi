// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import {TokensModuleApi} from './module/api'
import {OcpiModule} from "@citrineos/ocpi-base";
import {EventGroup, ICache, IMessageHandler, IMessageSender, SystemConfig} from "@citrineos/base";
import {ILogObj, Logger} from "tslog";

export { TokensModuleApi } from './module/api'
export { ITokensModuleApi } from './module/interface';

export class TokensModule implements OcpiModule {

    constructor(
        config: SystemConfig,
        cache: ICache,
        handler: IMessageHandler,
        sender: IMessageSender,
        eventGroup: EventGroup,
        logger?: Logger<ILogObj>,
    ) {}

    getController(): any {
        return TokensModuleApi

    }

    init(handler?: IMessageHandler, sender?: IMessageSender): void {
    }
}
