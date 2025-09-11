// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod';
import { AuthMethod } from './AuthMethod';
import { CdrTokenSchema } from './CdrToken';
import { CdrLocationSchema } from './CdrLocation';
import { TariffSchema } from './Tariff';
import { ChargingPeriodSchema } from './ChargingPeriod';
import { SignedDataSchema } from './SignedData';
import { PriceSchema } from './Price';
import { OcpiResponseStatusCode } from './OcpiResponse';

export const CdrSchema = z.object({
  country_code: z.string().length(2),
  party_id: z.string().max(3),
  id: z.string().max(39),
  start_date_time: z.coerce.date(),
  end_date_time: z.coerce.date(),
  session_id: z.string().max(36).nullable().optional(),
  cdr_token: CdrTokenSchema,
  auth_method: z.nativeEnum(AuthMethod),
  authorization_reference: z.string().max(36).nullable().optional(),
  cdr_location: CdrLocationSchema,
  meter_id: z.string().max(255).nullable().optional(),
  currency: z.string().length(3),
  tariffs: z.array(TariffSchema).nullable().optional(),
  charging_periods: z.array(ChargingPeriodSchema).min(1),
  signed_data: SignedDataSchema.nullable().optional(),
  total_cost: PriceSchema,
  total_fixed_cost: PriceSchema.optional(),
  total_energy: z.number(),
  total_energy_cost: PriceSchema.nullable().optional(),
  total_time: z.number(),
  total_time_cost: PriceSchema.nullable().optional(),
  total_parking_time: z.number().nullable().optional(),
  total_parking_cost: PriceSchema.nullable().optional(),
  total_reservation_cost: PriceSchema.nullable().optional(),
  remark: z.string().max(255).nullable().optional(),
  invoice_reference_id: z.string().max(39).nullable().optional(),
  credit: z.boolean().nullable().optional(),
  credit_reference_id: z.string().max(39).nullable().optional(),
  home_charging_compensation: z.boolean().nullable().optional(),
  last_updated: z.coerce.date(),
});

export type Cdr = z.infer<typeof CdrSchema>;

export const CdrResponseSchema = z.object({
  status_code: z.nativeEnum(OcpiResponseStatusCode),
  status_message: z.string().optional(),
  timestamp: z.coerce.date(),
  data: CdrSchema,
});

export type CdrResponse = z.infer<typeof CdrResponseSchema>;

export const PaginatedCdrResponseSchema = z.object({
  status_code: z.nativeEnum(OcpiResponseStatusCode),
  status_message: z.string().optional(),
  timestamp: z.coerce.date(),
  total: z.number().int().nonnegative(),
  offset: z.number().int().nonnegative(),
  limit: z.number().int().min(0).max(200),
  link: z.string(),
  data: z.array(CdrSchema),
});

export type PaginatedCdrResponse = z.infer<typeof PaginatedCdrResponseSchema>;
export const PaginatedCdrResponseSchemaName = 'PaginatedCdrResponse';
