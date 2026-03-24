// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import type {
  AuthorizationInfoResponse,
  OcpiEmptyResponse,
  PaginatedTokenResponse,
  TokenResponse,
} from '@citrineos/ocpi-base';

export interface ITokensModuleApi {
  getTokensPaginated(...args: any[]): Promise<PaginatedTokenResponse>;
  getTokens(...args: any[]): Promise<TokenResponse | OcpiEmptyResponse>;
  putToken(...args: any[]): Promise<OcpiEmptyResponse>;
  patchToken(...args: any[]): Promise<OcpiEmptyResponse>;
  postAuthorize(...args: any[]): Promise<AuthorizationInfoResponse>;
}
