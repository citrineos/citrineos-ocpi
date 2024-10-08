// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { Service } from 'typedi';
import { OcpiToken } from '../model/OcpiToken';
import { OcpiSequelizeInstance } from '../util/OcpiSequelizeInstance';
import { SequelizeRepository, SequelizeTransaction } from '@citrineos/data';
import { OcpiLogger } from '../util/OcpiLogger';
import { SystemConfig } from '@citrineos/base';
import { OcpiNamespace } from '../util/OcpiNamespace';
import { TokenDTO } from '../model/DTO/TokenDTO';
import { ServerConfig } from '../config/ServerConfig';

@Service()
export class TokensRepository extends SequelizeRepository<OcpiToken> {
  constructor(
    systemConfig: ServerConfig,
    private readonly logger: OcpiLogger,
    ocpiSequelizeInstance: OcpiSequelizeInstance,
  ) {
    super(
      systemConfig as SystemConfig,
      OcpiNamespace.OcpiToken,
      logger,
      ocpiSequelizeInstance.sequelize,
    );
  }

  async patch(
    transactionCallback: (
      transaction: SequelizeTransaction,
    ) => Promise<TokenDTO>,
  ): Promise<TokenDTO> {
    return await this.s.transaction(
      async (transaction) => await transactionCallback(transaction),
    );
  }
}
