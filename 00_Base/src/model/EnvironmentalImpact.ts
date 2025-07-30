import { z } from 'zod';
import { EnvironmentalImpactCategory } from './EnvironmentalImpactCategory';

export const EnvironmentalImpactSchema = z.object({
  category: z.nativeEnum(EnvironmentalImpactCategory),
  amount: z.number().min(0),
});

export type EnvironmentalImpact = z.infer<typeof EnvironmentalImpactSchema>;
