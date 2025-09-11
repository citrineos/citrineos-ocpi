// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod';

export const LocationReferencesSchema = z.object({
  location_id: z.string().max(36),
  evse_uids: z.array(z.string()),
});

export type LocationReferences = z.infer<typeof LocationReferencesSchema>;
