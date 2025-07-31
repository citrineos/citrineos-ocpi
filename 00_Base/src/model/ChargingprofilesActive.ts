import { z } from 'zod';
import { ActiveChargingProfileSchema } from './ActiveChargingProfile';

export const ChargingprofilesActiveSchema = z.object({
  start_date_time: z.coerce.date(),
  charging_profile: ActiveChargingProfileSchema,
});

export type ChargingprofilesActive = z.infer<
  typeof ChargingprofilesActiveSchema
>;
