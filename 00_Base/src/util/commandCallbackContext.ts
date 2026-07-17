// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import type { OcpiHeaders } from '../model/OcpiHeaders.js';

export interface CommandCallbackContext {
  responseUrl: string;
  fromCountryCode: string;
  fromPartyId: string;
  toCountryCode: string;
  toPartyId: string;
}

export interface OcpiRoutingHeaders {
  fromCountryCode: string;
  fromPartyId: string;
  toCountryCode: string;
  toPartyId: string;
}

export function serializeCommandCallbackContext(
  responseUrl: string,
  ocpiHeaders: OcpiHeaders,
): string {
  return JSON.stringify({
    responseUrl,
    fromCountryCode: ocpiHeaders.fromCountryCode,
    fromPartyId: ocpiHeaders.fromPartyId,
    toCountryCode: ocpiHeaders.toCountryCode,
    toPartyId: ocpiHeaders.toPartyId,
  } satisfies CommandCallbackContext);
}

export function parseCommandCallbackContext(
  cached: string,
): CommandCallbackContext | null {
  try {
    const parsed = JSON.parse(cached) as Partial<CommandCallbackContext>;
    if (
      typeof parsed.responseUrl === 'string' &&
      typeof parsed.fromCountryCode === 'string' &&
      typeof parsed.fromPartyId === 'string' &&
      typeof parsed.toCountryCode === 'string' &&
      typeof parsed.toPartyId === 'string'
    ) {
      return parsed as CommandCallbackContext;
    }
  } catch {
    return null;
  }
  return null;
}

/** Swap inbound command routing headers for the CPO → eMSP callback. */
export function swapRoutingForCallback(
  context: CommandCallbackContext,
): OcpiRoutingHeaders {
  console.log('swapRoutingForCallback', context);
  return {
    fromCountryCode: context.toCountryCode,
    fromPartyId: context.toPartyId,
    toCountryCode: context.fromCountryCode,
    toPartyId: context.fromPartyId,
  };
}
