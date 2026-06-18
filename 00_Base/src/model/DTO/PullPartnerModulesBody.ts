// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod';
import { DEFAULT_LIMIT, DEFAULT_OFFSET } from '../PaginatedResponse.js';

/**
 * Admin trigger body: OCPI identity + optional GET List pagination (Sender 8.2.1.1).
 */
export const PullPartnerModulesBodySchema = z.object({
  ourCountryCode: z.string().min(2).max(2),
  ourPartyId: z.string().min(1).max(3),
  cpoCountryCode: z.string().min(2).max(2),
  cpoPartyId: z.string().min(1).max(3),
  offset: z.number().int().min(0).optional().default(DEFAULT_OFFSET),
  limit: z.number().int().min(1).optional().default(DEFAULT_LIMIT),
  date_from: z.union([z.coerce.date(), z.string()]).optional(),
  date_to: z.union([z.coerce.date(), z.string()]).optional(),
  roamingPartnerCountryCode: z.string().min(2).max(2),
  roamingPartnerPartyId: z.string().min(1).max(3),
});

export const PullPartnerModulesBodySchemaName = 'PullPartnerModulesBodySchema';

export type PullPartnerModulesBody = z.infer<
  typeof PullPartnerModulesBodySchema
>;

export type PullSummary = {
  module: string;
  processed: number;
  upsertSucceeded: number;
  upsertFailed: number;
  skippedInvalid: number;
  LocationsMarkedRemoved?: number;
  LocationsMarkedRemovedFailed?: number;
};

export const PullSummarySchema = z.object({
  module: z.string(),
  processed: z.number(),
  upsertSucceeded: z.number(),
  upsertFailed: z.number(),
  skippedInvalid: z.number(),
  LocationsMarkedRemoved: z.number().optional(),
  LocationsMarkedRemovedFailed: z.number().optional(),
});
