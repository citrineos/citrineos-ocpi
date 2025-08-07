import { z } from 'zod';
import { DisplayTextSchema } from './DisplayText';
import { GeoLocationSchema } from './GeoLocation';

export const AdditionalGeoLocationSchema = GeoLocationSchema.extend({
  name: DisplayTextSchema.nullable().optional(),
});

export type AdditionalGeoLocation = z.infer<typeof AdditionalGeoLocationSchema>;
