// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { ILogObj, Logger } from 'tslog';
import { ILocationsModuleApi } from './interface';
import { LocationsModule } from './module';

/**
 * Server API for the provisioning component.
 */
export class LocationsModuleApi implements ILocationsModuleApi {
  /**
   * Constructs a new instance of the class.
   *
   * @param {LocationsModule} LocationsModule - The Locations module.
   * @param {Logger<ILogObj>} [logger] - The logger for logging.
   */
  constructor(
    locationsModule: LocationsModule,
    // server: KoaInstance,
    logger?: Logger<ILogObj>,
  ) {}
}
