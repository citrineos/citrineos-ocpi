// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { Service } from 'typedi';
import { OcpiToken } from '../model/OcpiToken';
import { OcpiSequelizeInstance } from '../util/sequelize';
import {
  SequelizeRepository,
  SequelizeTransaction,
} from '@citrineos/data';
import { OcpiServerConfig } from '../config/ocpi.server.config';
import { OcpiLogger } from '../util/logger';
import { SystemConfig } from '@citrineos/base';
import { OcpiNamespace } from '../util/ocpi.namespace';
import { TokenDTO } from '../model/DTO/TokenDTO';

@Service()
export class TokensRepository extends SequelizeRepository<OcpiToken> {
  constructor(
    ocpiSystemConfig: OcpiServerConfig,
    private readonly logger: OcpiLogger,
    ocpiSequelizeInstance: OcpiSequelizeInstance,
  ) {
    super(
      ocpiSystemConfig as SystemConfig,
      OcpiNamespace.OcpiToken,
      logger,
      ocpiSequelizeInstance.sequelize,
    );
  }

  async patch(transactionCallback: (transaction: SequelizeTransaction) => Promise<TokenDTO>): Promise<TokenDTO> {
    return await this.s.transaction(async (transaction) => {
      return await transactionCallback(transaction);
    });
  }
}
