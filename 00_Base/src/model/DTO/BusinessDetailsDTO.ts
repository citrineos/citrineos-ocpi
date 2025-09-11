// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod';
import { ImageDTOSchema } from './ImageDTO';

export const BusinessDetailsSchema = z.object({
  name: z.string().max(100),
  website: z.string().url().nullable().optional(),
  logo: ImageDTOSchema.nullable().optional(),
});

export type BusinessDetailsDTO = z.infer<typeof BusinessDetailsSchema>;
