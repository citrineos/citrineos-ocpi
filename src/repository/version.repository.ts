// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import {SequelizeRepository} from '@citrineos/data';
import {Version} from '../model/Version';
import {Service} from "typedi";
import {OcpiServerConfig} from "../config/ocpi.server.config";
import {OcpiLogger} from "../util/logger";
import {SystemConfig} from "@citrineos/base";
import {OcpiSequelizeInstance} from "../util/sequelize";

@Service()
export class VersionRepository extends SequelizeRepository<Version> {

  constructor(
    ocpiSystemConfig: OcpiServerConfig,
    logger: OcpiLogger,
    ocpiSequelizeInstance: OcpiSequelizeInstance
  ) {
    super(ocpiSystemConfig as SystemConfig, logger, ocpiSequelizeInstance.sequelize);
  }

}
