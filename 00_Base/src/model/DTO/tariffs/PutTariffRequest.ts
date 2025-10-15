// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod';
import { TariffType } from '../../TariffType';
import { DisplayTextSchema } from '../../DisplayText';
import { PriceSchema } from '../../Price';
import { TariffElementSchema } from '../../TariffElement';
import { EnergyMixSchema } from '../../EnergyMix';

export const PutTariffRequestSchema = z.object({
  id: z.string().max(36),
  country_code: z.string().min(2).max(2),
  party_id: z.string().max(3),
  currency: z.string().length(3),
  type: z.nativeEnum(TariffType).nullable().optional(),
  tariff_alt_text: z.array(DisplayTextSchema).nullable().optional(),
  tariff_alt_url: z.string().url().nullable().optional(),
  min_price: PriceSchema.nullable().optional(),
  max_price: PriceSchema.nullable().optional(),
  elements: z.array(TariffElementSchema).min(1),
  energy_mix: EnergyMixSchema.nullable().optional(),
  start_date_time: z.coerce.date().nullable().optional(),
  end_date_time: z.coerce.date().nullable().optional(),
});
export const PutTariffRequestSchemaName = 'PutTariffRequest';

export type PutTariffRequest = z.infer<typeof PutTariffRequestSchema>;
