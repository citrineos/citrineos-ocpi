// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { SequelizeRepository } from '@citrineos/data';
import { Service } from 'typedi';
import { ServerConfig } from '../config/ServerConfig';
import { OcpiLogger } from '../util/OcpiLogger';
import { SystemConfig } from '@citrineos/base';
import { OcpiSequelizeInstance } from '../util/OcpiSequelizeInstance';
import { OcpiNamespace } from '../util/OcpiNamespace';
import { ResponseUrlCorrelationId } from '../model/ResponseUrlCorrelationId';
import { OcpiParams } from '../trigger/util/OcpiParams';

@Service()
export class ResponseUrlRepository extends SequelizeRepository<ResponseUrlCorrelationId> {
  constructor(
    systemConfig: ServerConfig,
    logger: OcpiLogger,
    ocpiSequelizeInstance: OcpiSequelizeInstance,
  ) {
    super(
      systemConfig as SystemConfig,
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
