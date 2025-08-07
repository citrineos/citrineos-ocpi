import { z } from 'zod';

export const SignedValueSchema = z.object({
  nature: z.string().max(32),
  plain_data: z.string().max(512),
  signed_data: z.string().max(5000),
});

export type SignedValue = z.infer<typeof SignedValueSchema>;
