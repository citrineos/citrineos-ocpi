import { z } from 'zod';

export const OcpiEvseSchema = z.object({
  evseId: z.number(),
  stationId: z.string(),
  physicalReference: z.string().optional(),
  removed: z.boolean().optional(),
  lastUpdated: z.date(),
});

export type OcpiEvse = z.infer<typeof OcpiEvseSchema>;
