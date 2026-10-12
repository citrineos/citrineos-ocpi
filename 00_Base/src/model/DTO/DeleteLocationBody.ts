// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod';
import { DEFAULT_LIMIT, DEFAULT_OFFSET } from '../PaginatedResponse.js';

/**
 * Admin trigger body: OCPI identity + optional GET List pagination (Sender 8.2.1.1).
 */
export const DeleteLocationBodySchema = z.object({
  ourCountryCode: z.string().min(2).max(2),
  ourPartyId: z.string().min(1).max(3),
  locationId: z.string().min(1).max(36),
});

export const DeleteLocationBodySchemaName = 'DeleteLocationBodySchema';

export type DeleteLocationBody = z.infer<
  typeof DeleteLocationBodySchema   
>;

export type DeleteLocationSummary = {
  patchSucceeded: number;
  patchFailed: number;
};

export const DeleteLocationSummarySchema = z.object({
  patchSucceeded: z.number(),
  patchFailed: z.number(),
});
