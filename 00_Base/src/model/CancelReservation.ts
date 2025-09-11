// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod';
import { ResponseUrlSchema } from './ResponseUrl';

export const CancelReservationSchema = ResponseUrlSchema.extend({
  reservation_id: z.string().max(36),
});
export const CancelReservationSchemaName = 'CancelReservation';

export type CancelReservation = z.infer<typeof CancelReservationSchema>;
