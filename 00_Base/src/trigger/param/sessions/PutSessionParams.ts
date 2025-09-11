// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod';
import { OcpiParamsSchema } from '../../util/OcpiParams';
import { SessionSchema } from '../../../model/Session';

export const PutSessionParamsSchema = OcpiParamsSchema.extend({
  sessionId: z.string().length(36),
  session: SessionSchema,
});

export type PutSessionParams = z.infer<typeof PutSessionParamsSchema>;
