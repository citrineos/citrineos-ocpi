// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import Koa from "koa";
import { VersionsModuleApi } from './module/api'
import {BaseOcpiModule, IOcpiModule, OcpiModuleConfig} from "@citrineos/ocpi-base";

export { VersionsModuleApi } from './module/api'
export { VersionsOcppHandlers } from './module/handlers';
export { IVersionsModuleApi } from './module/interface';

export class VersionsModule extends BaseOcpiModule implements IOcpiModule {
    constructor(koa: Koa, config: OcpiModuleConfig) {
        super(koa, config, [VersionsModuleApi]);
    }
}
