// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod';
import { DEFAULT_LIMIT, DEFAULT_OFFSET } from '../PaginatedResponse.js';

/**
 * Admin trigger body: OCPI identity + optional GET List pagination (Sender 8.2.1.1).
 */
export const PushPartnerModulesBodySchema = z.object({
  ourCountryCode: z.string().min(2).max(2),
  ourPartyId: z.string().min(1).max(3),
  partnerCountryCode: z.string().min(2).max(2),
  partnerPartyId: z.string().min(1).max(3),
  offset: z.number().int().min(0).optional().default(DEFAULT_OFFSET),
  limit: z.number().int().min(1).optional().default(DEFAULT_LIMIT),
  date_from: z.union([z.coerce.date(), z.string()]).optional(),
  date_to: z.union([z.coerce.date(), z.string()]).optional(),
});

export const PushPartnerModulesBodySchemaName = 'PushPartnerModulesBodySchema';

export type PushPartnerModulesBody = z.infer<
  typeof PushPartnerModulesBodySchema
>;

export type PushSummary = {
  module: string;
  processed: number;
  pushSucceeded: number;
  pushFailed: number;
  skippedInvalid: number;
};

export const PushSummarySchema = z.object({
  module: z.string(),
  processed: z.number(),
  pushSucceeded: z.number(),
  pushFailed: z.number(),
  skippedInvalid: z.number(),
});
