// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { BaseBroadcaster } from './BaseBroadcaster.js';
import { Service } from 'typedi';
import { TokensClientApi } from '../trigger/TokensClientApi.js';
import type { ILogObj } from 'tslog';
import { Logger } from 'tslog';
import { ModuleId } from '../model/ModuleId.js';
import { InterfaceRole } from '../model/InterfaceRole.js';
import type { AuthorizationDto, TenantDto } from '@zetra/citrineos-base';
import { HttpMethod } from '@zetra/citrineos-base';
import { TokensMapper } from '../mapper/index.js';
import { OcpiEmptyResponseSchema } from '../model/OcpiEmptyResponse.js';
import type { TokenDTO } from '../model/DTO/TokenDTO.js';

@Service()
export class TokenBroadcaster extends BaseBroadcaster {
  constructor(
    readonly logger: Logger<ILogObj>,
    readonly tokensClientApi: TokensClientApi,
  ) {
    super();
  }

  async broadcastPutToken(
    tenant: TenantDto,
    tokenDto: AuthorizationDto,
  ): Promise<void> {
    const token = TokensMapper.toDto(tokenDto);
    const path = `/${tenant.countryCode}/${tenant.partyId}/${token.uid}`;
    await this.broadcastToken(tenant, token, HttpMethod.Put, path);
  }

  async broadcastPatchToken(
    tenant: TenantDto,
    tokenDto: Partial<AuthorizationDto>,
  ): Promise<void> {
    const token = TokensMapper.toPartialDto(tokenDto);
    const path = `/${tenant.countryCode}/${tenant.partyId}/${token.uid}`;
    await this.broadcastToken(tenant, token, HttpMethod.Patch, path);
  }

  async broadcastDeleteToken(
    tenant: TenantDto,
    tokenDto: Partial<AuthorizationDto>,
  ): Promise<void> {
    const token = {
      valid: false,
      uid: tokenDto.idToken,
      last_updated: tokenDto.updatedAt,
    };
    const path = `/${tenant.countryCode}/${tenant.partyId}/${token.uid}`;
    await this.broadcastToken(tenant, token, HttpMethod.Patch, path);
  }

  private async broadcastToken(
    tenant: TenantDto,
    token: Partial<TokenDTO>,
    method: HttpMethod,
    path: string,
  ): Promise<void> {
    try {
      const otherParams: Record<string, string> | undefined = token.type
        ? { type: token.type }
        : undefined;
      await this.tokensClientApi.broadcastToClients({
        cpoCountryCode: tenant.countryCode!,
        cpoPartyId: tenant.partyId!,
        moduleId: ModuleId.Tokens,
        interfaceRole: InterfaceRole.RECEIVER,
        httpMethod: method,
        schema: OcpiEmptyResponseSchema,
        body: {
          ...token,
          party_id: tenant.partyId,
          country_code: tenant.countryCode,
        },
        path: path,
        otherParams,
      });
    } catch (e) {
      this.logger.error(`broadcast${method}Token failed for ${path}`, e);
    }
  }
}
