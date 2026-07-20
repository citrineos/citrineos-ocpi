// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod';

export enum OcpiResponseStatusCode {
  GenericSuccessCode = 1000,
  ClientGenericError = 2000,
  ClientInvalidOrMissingParameters = 2001,
  ClientNotEnoughInformation = 2002,
  ClientUnknownLocation = 2003,
  ClientUnknownToken = 2004,
  ServerGenericError = 3000,
  ServerUnableToUseClientApi = 3001,
  ServerUnsupportedVersion = 3002,
  ServerNoMatchingEndpoints = 3003,
  HubGenericError = 4000,
  HubUnknownReceiver = 4001,
  HubTimeoutOnForwardedMessage = 4002,
  HubConnectionProblem = 4003,
}

export const OcpiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    status_code: z.nativeEnum(OcpiResponseStatusCode),
    status_message: z.string().optional(),
    timestamp: z.coerce.date(),
    data: dataSchema.optional(),
  });

/**
 * When `CITRINEOS_OCPI_INCLUDE_STATUS_MESSAGE=false`, omit `status_message`
 * from OCPI responses. Defaults to including it.
 */
export const includeOcpiStatusMessage = (): boolean =>
  process.env.CITRINEOS_OCPI_INCLUDE_STATUS_MESSAGE?.toLowerCase() !== 'false';

export const buildOcpiResponse = <T>(
  status_code: OcpiResponseStatusCode,
  data?: T,
  status_message?: string,
) => ({
  status_code,
  ...(includeOcpiStatusMessage() ? { status_message } : {}),
  data,
  timestamp: new Date(),
});
