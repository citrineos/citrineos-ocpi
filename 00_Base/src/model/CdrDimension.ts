import { z } from 'zod';
import { CdrDimensionType } from './CdrDimensionType';

export const CdrDimensionSchema = z.object({
  type: z.nativeEnum(CdrDimensionType),
  volume: z.number(),
});

export type CdrDimension = z.infer<typeof CdrDimensionSchema>;
