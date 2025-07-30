import { z } from 'zod';

export const PriceSchema = z.object({
  excl_vat: z.number(),
  incl_vat: z.number().nullable().optional(),
});

export type Price = z.infer<typeof PriceSchema>;
