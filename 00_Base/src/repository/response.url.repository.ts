// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { SequelizeRepository } from '@citrineos/data';
import { Service } from 'typedi';
import { OcpiServerConfig } from '../config/ocpi.server.config';
import { OcpiLogger } from '../util/logger';
import { SystemConfig } from '@citrineos/base';
import { OcpiSequelizeInstance } from '../util/sequelize';
import { OcpiNamespace } from '../util/ocpi.namespace';
import { ResponseUrlCorrelationId } from '../model/ResponseUrlCorrelationId';

@Service()
export class ResponseUrlRepository extends SequelizeRepository<ResponseUrlCorrelationId> {
  constructor(
    ocpiSystemConfig: OcpiServerConfig,
    logger: OcpiLogger,
    ocpiSequelizeInstance: OcpiSequelizeInstance,
  ) {
    super(
      ocpiSystemConfig as SystemConfig,
      OcpiNamespace.Commands,
      logger,
      ocpiSequelizeInstance.sequelize,
    );
  }

  public getResponseUrl = async (
    correlationId: string,
  ): Promise<ResponseUrlCorrelationId | null> =>
    await ResponseUrlCorrelationId.findOne({
      where: {
        correlationId: correlationId,
      },
    });

  public saveResponseUrl = async (
    correlationId: string,
    responseUrl: string,
  ): Promise<ResponseUrlCorrelationId> =>
    await ResponseUrlCorrelationId.create({
      correlationId: correlationId,
      responseUrl: responseUrl,
    });
}
