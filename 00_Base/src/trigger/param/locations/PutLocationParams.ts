import { z } from 'zod';

export const PutLocationParamsSchema = z.object({
  locationId: z.string().length(36),
});

export type PutLocationParams = z.infer<typeof PutLocationParamsSchema>;
