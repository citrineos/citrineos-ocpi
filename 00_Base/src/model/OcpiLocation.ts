import { z } from 'zod';

export const OcpiLocationSchema = z.object({
  coreLocationId: z.number(),
  publish: z.boolean(),
  lastUpdated: z.date(),
  partyId: z.string().length(3),
  countryCode: z.string().length(2),
  timeZone: z.string(),
});

export type OcpiLocation = z.infer<typeof OcpiLocationSchema>;
