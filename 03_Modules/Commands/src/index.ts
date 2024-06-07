// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { CommandsModuleApi } from "./module/api";
import {IOcpiModule} from '@citrineos/ocpi-base';

export { CommandsModuleApi } from './module/api';
export { CommandsOcppHandlers } from './module/handlers';
export { ICommandsModuleApi } from './module/interface';

export class CommandsModule implements IOcpiModule {
    getController(): any {
        return CommandsModuleApi
    }
}