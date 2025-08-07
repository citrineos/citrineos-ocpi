import { z } from 'zod';

export const DisplayTextSchema = z.object({
  language: z.string().min(2).max(2),
  text: z.string().max(512),
});

export type DisplayText = z.infer<typeof DisplayTextSchema>;
