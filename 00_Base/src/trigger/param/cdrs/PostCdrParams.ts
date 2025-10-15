// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod';
import { CdrSchema } from '../../../model/Cdr';
import { OcpiParamsSchema } from '../../util/OcpiParams';

export const PostCdrParamsSchema = OcpiParamsSchema.extend({
  cdr: CdrSchema,
});
export type PostCdrParams = z.infer<typeof PostCdrParamsSchema>;
