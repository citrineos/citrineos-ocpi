// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod';

export const PriceSchema = z.object({
  excl_vat: z.number(),
  incl_vat: z.number().nullable().optional(),
});

export type Price = z.infer<typeof PriceSchema>;
