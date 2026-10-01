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
  roamingPartnerCountryCode: z
    .string()
    .regex(/^[A-Z]{2}$/, 'must be 2 uppercase letters'),
  roamingPartnerPartyId: z
    .string()
    .regex(/^[A-Za-z0-9]{3}$/, 'must be 3 alphanumeric characters'),
  roamingPartnerName: z.string().trim().min(1).max(100),
  roamingPartnerSignatureDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}(T.*)?$/, 'must be a YYYY-MM-DD date'),
  roamingPartnerContractStartDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}(T.*)?$/, 'must be a YYYY-MM-DD date'),
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
