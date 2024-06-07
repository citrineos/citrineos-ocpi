// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { Container } from 'typedi';
import {useContainer, useKoaServer} from 'routing-controllers';
import Koa from "koa";
import { CommandsModuleApi } from "./module/api";

export { CommandsModuleApi } from './module/api';
export { ICommandsModuleApi } from './module/interface';
export { CommandsModule } from './module/module';

export function initCommandsApi(koa: Koa) {
    useKoaServer(koa, { controllers: [CommandsModuleApi] });
}
