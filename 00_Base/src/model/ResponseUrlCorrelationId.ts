// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod';

export const ResponseUrlCorrelationIdSchema = z.object({
  correlationId: z.string(),
  responseUrl: z.string(),
  params: z.any().optional(),
});

export type ResponseUrlCorrelationId = z.infer<
  typeof ResponseUrlCorrelationIdSchema
>;
