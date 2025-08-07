import { z } from 'zod';

export const PatchEvseParamsSchema = z.object({
  locationId: z.number(),
  evseUid: z.string().length(36),
});

export type PatchEvseParams = z.infer<typeof PatchEvseParamsSchema>;
