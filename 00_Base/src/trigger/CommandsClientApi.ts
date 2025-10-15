// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { BaseClientApi, MissingRequiredParamException } from './BaseClientApi';
import { Inject, Service } from 'typedi';
import {
  OcpiEmptyResponse,
  OcpiEmptyResponseSchema,
} from '../model/OcpiEmptyResponse';
import { ModuleId } from '../model/ModuleId';
import { HttpMethod, ICache, OCPIRegistration } from '@citrineos/base';
import { CommandResult } from '../model/CommandResult';
import {
  COMMAND_RESPONSE_URL_CACHE_NAMESPACE,
  COMMAND_RESPONSE_URL_CACHE_RESOLVED,
} from '../util/Consts';
import { CacheWrapper } from '../util/CacheWrapper';

@Service()
export class CommandsClientApi extends BaseClientApi {
  protected cache!: ICache;

  constructor(@Inject() cacheWrapper: CacheWrapper) {
    super();
    this.cache = cacheWrapper.cache;
  }

  CONTROLLER_PATH = ModuleId.Commands;

  getUrl(): string {
    throw new MissingRequiredParamException(`url must be provided by command`);
  }

  async postCommandResult(
    fromCountryCode: string,
    fromPartyId: string,
    toCountryCode: string,
    toPartyId: string,
    partnerProfile: OCPIRegistration.PartnerProfile,
    url: string, // Provided in the command
    body: CommandResult,
    commandId: string,
  ): Promise<OcpiEmptyResponse> {
    await this.cache.set(
      commandId,
      COMMAND_RESPONSE_URL_CACHE_RESOLVED,
      COMMAND_RESPONSE_URL_CACHE_NAMESPACE,
      5, // Flush the resolution after a few seconds so that it doesn't stay in cache indefinitely
    );

    return this.request(
      fromCountryCode,
      fromPartyId,
      toCountryCode,
      toPartyId,
      HttpMethod.Post,
      OcpiEmptyResponseSchema,
      partnerProfile,
      true,
      url,
      body,
    );
  }
}
