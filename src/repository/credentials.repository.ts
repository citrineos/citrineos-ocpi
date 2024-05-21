// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import {SequelizeRepository} from '@citrineos/data';
import {SystemConfig, UnauthorizedException} from '@citrineos/base';
import {Credentials} from '../model/Credentials';
import {OcpiNamespace} from '../util/ocpi.namespace';
import {Service} from "typedi";
import {OcpiServerConfig} from "../config/ocpi.server.config";
import {OcpiLogger} from "../util/logger";

@Service()
export class CredentialsRepository extends SequelizeRepository<Credentials> {

  constructor(
    ocpiSystemConfig: OcpiServerConfig,
    logger: OcpiLogger,
  ) {
    super(ocpiSystemConfig as SystemConfig, logger);
  }

  public async authorizeToken(token: string): Promise<boolean> {
    const exists = await this.credentialsExistForGivenToken(token);
    if (!exists) {
      throw new UnauthorizedException('Credentials not found for given token');
    } else {
      return true;
    }
  }

  private credentialsExistForGivenToken = async (
    token: string,
  ): Promise<boolean> => {
    try {
      return await this.existsByKey(token, OcpiNamespace.Credentials);
    } catch (e) {
      return Promise.resolve(false);
    }
  };
}
