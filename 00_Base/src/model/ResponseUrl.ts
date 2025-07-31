import { z } from 'zod';

export const ResponseUrlSchema = z.object({
  response_url: z.string().url(),
});

export type ResponseUrl = z.infer<typeof ResponseUrlSchema>;
