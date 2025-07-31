import { z } from 'zod';
import { ChargingProfileSchema } from './ChargingProfile';

export const SetChargingProfileSchema = z.object({
  charging_profile: ChargingProfileSchema,
  response_url: z.string().url(),
});

export type SetChargingProfile = z.infer<typeof SetChargingProfileSchema>;
