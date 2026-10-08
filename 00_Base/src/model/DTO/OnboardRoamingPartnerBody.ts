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

/**
 * EMSP onboarding body: roaming partner identity + the billing details used to
 * create its Pennylane company customer (TS API). The customer name is
 * roamingPartnerName.
 */
export const OnboardRoamingPartnerEmspBodySchema =
  OnboardRoamingPartnerBodySchema.extend({
    // Values accepted by the TS API.
    paymentConditions: z.enum(['upon_receipt', '30_days']),
    emails: z.array(z.string().email()).min(1),
    billingAddress: z.object({
      address: z.string().trim().min(1),
      postalCode: z.string().trim().min(1),
      city: z.string().trim().min(1),
      countryAlpha2: z
        .string()
        .regex(/^[A-Z]{2}$/, 'must be 2 uppercase letters'),
    }),
    vatNumber: z
      .string()
      .regex(
        /^[A-Z]{2}[A-Z0-9]{2,13}$/,
        'must be a VAT number, e.g. FR32123456789',
      ),
    regNo: z.string().trim().min(1),
    phone: z.string().regex(/^\+?[0-9 .()-]{6,20}$/, 'must be a phone number'),
    recipient: z.string().trim().min(1),
    billingIban: z
      .string()
      .regex(
        /^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/,
        'must be an IBAN without spaces',
      ),
    notes: z.string().trim().min(1),
    billingLanguage: z
      .string()
      .regex(/^[a-z]{2}_[A-Z]{2}$/, 'must be a locale, e.g. fr_FR'),
    reference: z.string().trim().min(1).optional(),
    externalReference: z.string().trim().min(1).optional(),
  });

export const OnboardRoamingPartnerEmspBodySchemaName =
  'OnboardRoamingPartnerEmspBodySchema';

export type OnboardRoamingPartnerEmspBody = z.infer<
  typeof OnboardRoamingPartnerEmspBodySchema
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
