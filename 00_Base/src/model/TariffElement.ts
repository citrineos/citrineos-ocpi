import { z } from 'zod';
import { PriceComponentSchema } from './PriceComponent';
import { TariffRestrictionsSchema } from './TariffRestrictions';

export const TariffElementSchema = z.object({
  price_components: z.array(PriceComponentSchema).min(1),
  restrictions: TariffRestrictionsSchema.nullable().optional(),
});

export type TariffElement = z.infer<typeof TariffElementSchema>;
