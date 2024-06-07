// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import Koa from "koa";
import {useKoaServer} from "routing-controllers";

export { VersionsModuleApi } from './module/api';
export { IVersionsModuleApi } from './module/interface';
export { VersionsModule } from './module/module';
export { VersionRepository } from '../../../00_Base/src/repository/version.repository';
export { VersionsClientApi } from '../../../00_Base/src/trigger/VersionsClientApi';

import { VersionsModuleApi} from "./module/api";

export function initVersionsApi(koa: Koa) {
    useKoaServer(koa, { controllers: [VersionsModuleApi] });
}
