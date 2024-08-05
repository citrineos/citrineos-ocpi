// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { SequelizeRepository } from '@citrineos/data';
import { Version } from '../model/Version';
import { Service } from 'typedi';
import { OcpiServerConfig } from '../config/ocpi.server.config';
import { ILogObj, Logger } from 'tslog';
import { SystemConfig } from '@citrineos/base';
import { OcpiSequelizeInstance } from '../util/sequelize';
import { OcpiNamespace } from '../util/ocpi.namespace';
import { VersionNumber } from '../model/VersionNumber';
import { VersionEndpoint } from '../model/VersionEndpoint';

@Service()
export class VersionRepository extends SequelizeRepository<Version> {
  logger: Logger<ILogObj>;

  constructor(
    ocpiSystemConfig: OcpiServerConfig,
    logger: Logger<ILogObj>,
    ocpiSequelizeInstance: OcpiSequelizeInstance,
  ) {
    super(
      ocpiSystemConfig as SystemConfig,
      OcpiNamespace.Version,
      logger,
      ocpiSequelizeInstance.sequelize,
    );

    this.logger = logger;
  }

  async findVersionEndpointsByVersionNumber(
    versionNumber: VersionNumber,
  ): Promise<VersionEndpoint[]> {
    try {
      const storedVersion = await this.readOnlyOneByQuery(
        {
          where: {
            version: versionNumber,
          },
          include: [VersionEndpoint],
        },
        OcpiNamespace.Version,
      );
      if (storedVersion) {
        return storedVersion.endpoints;
      }
    } catch (error) {
      this.logger.error(error);
    }

    return [];
  }
}
