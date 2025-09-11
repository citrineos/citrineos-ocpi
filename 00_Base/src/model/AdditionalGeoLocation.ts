// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod';
import { DisplayTextSchema } from './DisplayText';
import { GeoLocationSchema } from './GeoLocation';

export const AdditionalGeoLocationSchema = GeoLocationSchema.extend({
  name: DisplayTextSchema.nullable().optional(),
});

export type AdditionalGeoLocation = z.infer<typeof AdditionalGeoLocationSchema>;
