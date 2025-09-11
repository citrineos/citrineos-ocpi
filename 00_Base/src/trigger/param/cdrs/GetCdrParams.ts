// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod';
import { OcpiParamsSchema } from '../../util/OcpiParams';

export const GetCdrParamsSchema = OcpiParamsSchema.extend({
  url: z.string().url(),
});
