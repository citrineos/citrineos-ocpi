// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { SessionsModuleApi } from "./module/api";
import { IOcpiModule } from "@citrineos/ocpi-base";
import {
  EventGroup,
  ICache,
  IMessageHandler,
  IMessageSender,
  SystemConfig,
} from "../../../../citrineos-core/00_Base";
import { ILogObj, Logger } from "tslog";
import { Container } from "typedi";
import { useContainer } from "routing-controllers";
import { SessionsOcppHandlers } from "./module/handlers";
import {
  SequelizeLocationRepository,
  SequelizeTransactionEventRepository,
} from "../../../../citrineos-core/01_Data/src/layers/sequelize";

export { SessionsModuleApi } from "./module/api";
export { ISessionsModuleApi } from "./module/interface";

useContainer(Container);

export class SessionsModule implements IOcpiModule {
  constructor(
    config: SystemConfig,
    cache: ICache,
    handler: IMessageHandler,
    sender: IMessageSender,
    eventGroup: EventGroup,
    logger?: Logger<ILogObj>,
  ) {
    new SessionsOcppHandlers(config, cache, sender, handler, logger);

    Container.set(
      SequelizeTransactionEventRepository,
      new SequelizeTransactionEventRepository(config, logger),
    );

    Container.set(
      SequelizeLocationRepository,
      new SequelizeLocationRepository(config, logger),
    );
  }

  getController(): any {
    return SessionsModuleApi;
  }
}
