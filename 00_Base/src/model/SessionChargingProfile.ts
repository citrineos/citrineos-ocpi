// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod';

export const SessionChargingProfileSchema = z.object({
  sessionId: z.string(),
  chargingProfileId: z.number(),
  chargingScheduleId: z.number(),
});

export type SessionChargingProfile = z.infer<
  typeof SessionChargingProfileSchema
>;
