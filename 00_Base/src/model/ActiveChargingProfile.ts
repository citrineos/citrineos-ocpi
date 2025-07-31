import { z } from 'zod';
import { ChargingProfileSchema } from './ChargingProfile';

export const ActiveChargingProfileSchema = z.object({
  start_date_time: z.coerce.date(),
  charging_profile: ChargingProfileSchema,
});

export type ActiveChargingProfile = z.infer<typeof ActiveChargingProfileSchema>;
