import { z } from 'zod';
import { CdrDimensionSchema } from './CdrDimension';

export const ChargingPeriodSchema = z.object({
  start_date_time: z.coerce.date(),
  dimensions: z.array(CdrDimensionSchema).min(1),
  tariff_id: z.string().max(36).nullable().optional(),
});

export type ChargingPeriod = z.infer<typeof ChargingPeriodSchema>;
