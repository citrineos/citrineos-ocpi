import { z } from 'zod';
import { EnergySourceCategory } from './EnergySourceCategory';

export const EnergySourcesSchema = z.object({
  source: z.nativeEnum(EnergySourceCategory),
  percentage: z.number().min(0).max(100),
});

export type EnergySources = z.infer<typeof EnergySourcesSchema>;
