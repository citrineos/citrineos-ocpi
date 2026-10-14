// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod';

/**
 * Admin trigger body: OCPI identity + optional GET List pagination (Sender 8.2.1.1).
 */
export const DeleteLocationBodySchema = z.object({
  ourCountryCode: z.string().min(2).max(2),
  ourPartyId: z.string().min(1).max(3),
  locationId: z.string().min(1).max(36),
});

export const DeleteLocationBodySchemaName = 'DeleteLocationBodySchema';

export type DeleteLocationBody = z.infer<typeof DeleteLocationBodySchema>;

export type DeleteLocationPartnerFailure = {
  partner: string;
  /** null = nothing was sent to this partner (pre-PATCH lookup failed); retry all EVSEs */
  failedEvseUids: string[] | null;
};

/** Counts are per EVSE PATCH, not per partner. */
export type DeleteLocationSummary = {
  evsesSucceeded: number;
  evsesFailed: number;
  failures: DeleteLocationPartnerFailure[];
};

export const DeleteLocationSummarySchema = z.object({
  evsesSucceeded: z.number(),
  evsesFailed: z.number(),
  failures: z.array(
    z.object({
      partner: z.string(),
      failedEvseUids: z.array(z.string()).nullable(),
    }),
  ),
});
