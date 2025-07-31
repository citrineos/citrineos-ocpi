import { z } from 'zod';

export const PatchConnectorParamsSchema = z.object({
  locationId: z.number(),
  evseUid: z.string().length(36),
  connectorId: z.number(),
});

export type PatchConnectorParams = z.infer<typeof PatchConnectorParamsSchema>;
