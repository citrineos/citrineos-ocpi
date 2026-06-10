// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import type { ILogObj } from 'tslog';
import { Logger } from 'tslog';

export interface KeycloakClientCredentialsConfig {
  tokenUrl?: string;
  url?: string;
  realm?: string;
  clientId: string;
  clientSecret: string;
}

const TOKEN_EXPIRY_MARGIN_MS = 20_000;

let cachedAccessToken: string | null = null;
let tokenExpiresAtMs: number | null = null;
let cachedConfigKey: string | null = null;

function configCacheKey(config: KeycloakClientCredentialsConfig): string {
  return JSON.stringify({
    tokenUrl: config.tokenUrl,
    url: config.url,
    realm: config.realm,
    clientId: config.clientId,
  });
}

function jwtPayloadExpUtcMs(accessToken: string): number | null {
  const parts = accessToken.split('.');
  if (parts.length < 2) {
    return null;
  }
  const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf8');
  const payload = JSON.parse(payloadJson) as { exp?: number };
  return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
}

function buildTokenUrl(config: KeycloakClientCredentialsConfig): string {
  if (config.tokenUrl) {
    return config.tokenUrl;
  }
  const baseUrl = (config.url ?? 'http://keycloak:8180/auth').replace(
    /\/$/,
    '',
  );
  const realm = config.realm ?? 'patterm';
  return `${baseUrl}/realms/${realm}/protocol/openid-connect/token`;
}

export async function getKeycloakClientCredentialsToken(
  config: KeycloakClientCredentialsConfig,
  logger?: Logger<ILogObj>,
): Promise<string> {
  const nowMs = Date.now();
  const cacheKey = configCacheKey(config);

  if (
    cachedAccessToken &&
    cachedConfigKey === cacheKey &&
    tokenExpiresAtMs !== null &&
    nowMs < tokenExpiresAtMs - TOKEN_EXPIRY_MARGIN_MS
  ) {
    return cachedAccessToken;
  }

  const tokenUrl = buildTokenUrl(config);
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: config.clientId,
    client_secret: config.clientSecret,
  });

  logger?.debug('Requesting Keycloak client credentials token', {
    tokenUrl,
    clientId: config.clientId,
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Keycloak token error ${response.status}: ${text}`);
  }

  const tokenData = (await response.json()) as { access_token?: string };
  const accessToken = tokenData.access_token;
  if (!accessToken) {
    throw new Error('No access_token in Keycloak response');
  }

  cachedAccessToken = accessToken;
  cachedConfigKey = cacheKey;
  tokenExpiresAtMs = jwtPayloadExpUtcMs(accessToken);
  if (tokenExpiresAtMs === null) {
    tokenExpiresAtMs = nowMs + 5 * 60 * 1000;
  }

  return accessToken;
}
