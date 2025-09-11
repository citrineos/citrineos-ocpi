// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod';

export const OcpiEvseSchema = z.object({
  evseId: z.string(),
  stationId: z.string(),
  physicalReference: z.string().optional(),
  removed: z.boolean().optional(),
  lastUpdated: z.date(),
});

export type OcpiEvse = z.infer<typeof OcpiEvseSchema>;
