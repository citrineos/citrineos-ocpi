import { z } from 'zod';

export const PutLocationParamsSchema = z.object({
  locationId: z.number(),
});

export type PutLocationParams = z.infer<typeof PutLocationParamsSchema>;
