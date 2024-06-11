// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { VersionsModuleApi } from './module/api'
import {IOcpiModule} from "@citrineos/ocpi-base";

export { VersionsModuleApi } from './module/api'
export { VersionsOcppHandlers } from './module/handlers';
export { IVersionsModuleApi } from './module/interface';

export class VersionsModule implements IOcpiModule {
    getController(): any {
        return VersionsModuleApi
    }
}
