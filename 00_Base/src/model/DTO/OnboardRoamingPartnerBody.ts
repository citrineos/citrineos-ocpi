// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod';

/**
 * Admin trigger body: OCPI identity + optional GET List pagination (Sender 8.2.1.1).
 */
export const OnboardRoamingPartnerBodySchema = z.object({
  ourCountryCode: z.string().min(2).max(2),
  ourPartyId: z.string().min(1).max(3),
  partnerCountryCode: z.string().min(2).max(2),
  partnerPartyId: z.string().min(1).max(3),
  roamingPartnerCountryCode: z.string().min(2).max(2),
  roamingPartnerPartyId: z.string().min(1).max(3),
});

export const OnboardRoamingPartnerBodySchemaName =
  'OnboardRoamingPartnerBodySchema';

export type OnboardRoamingPartnerBody = z.infer<
  typeof OnboardRoamingPartnerBodySchema
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
