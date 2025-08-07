import { z } from 'zod';

export const SessionChargingProfileSchema = z.object({
  sessionId: z.string(),
  chargingProfileId: z.number(),
  chargingScheduleId: z.number(),
});

export type SessionChargingProfile = z.infer<
  typeof SessionChargingProfileSchema
>;
