// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import type { OcpiConfigInput } from '@citrineos/ocpi-base';

export function buildCommandsKeycloakConfig():
  | NonNullable<OcpiConfigInput['commands']>['keycloak']
  | undefined {
  const clientId = process.env.KEYCLOAK_CLIENT_ID;
  const clientSecret = process.env.KEYCLOAK_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return undefined;
  }

  return {
    url: process.env.KEYCLOAK_URL,
    realm: process.env.KEYCLOAK_REALM,
    tokenUrl: process.env.KEYCLOAK_TOKEN_URL,
    clientId,
    clientSecret,
  };
}
