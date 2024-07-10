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
import { OcpiParams } from "../trigger/util/ocpi.params";

@Service()
export class ResponseUrlRepository extends SequelizeRepository<ResponseUrlCorrelationId> {
  constructor(
    ocpiSystemConfig: OcpiServerConfig,
    logger: OcpiLogger,
    ocpiSequelizeInstance: OcpiSequelizeInstance,
  ) {
    super(
      ocpiSystemConfig as SystemConfig,
      OcpiNamespace.ResponseUrlCorrelationId,
      logger,
      ocpiSequelizeInstance.sequelize,
    );
  }

  public getResponseUrl = async (
    correlationId: string,
  ): Promise<ResponseUrlCorrelationId | undefined> =>
    await this.readOnlyOneByQuery({
      where: {
        correlationId: correlationId,
      },
    });

  public saveResponseUrl = async (
    correlationId: string,
    responseUrl: string,
    params?: OcpiParams,
  ): Promise<ResponseUrlCorrelationId> =>
    await this.create(
      ResponseUrlCorrelationId.build({
        correlationId: correlationId,
        responseUrl: responseUrl,
        params: params,
      }),
    );
}
