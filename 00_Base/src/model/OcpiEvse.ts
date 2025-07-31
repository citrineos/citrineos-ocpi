import { z } from 'zod';

export const OcpiEvseSchema = z.object({
  evseId: z.string(),
  stationId: z.string(),
  physicalReference: z.string().optional(),
  removed: z.boolean().optional(),
  lastUpdated: z.date(),
});

export type OcpiEvse = z.infer<typeof OcpiEvseSchema>;
