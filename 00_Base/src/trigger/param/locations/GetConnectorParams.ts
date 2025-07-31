import { z } from 'zod';
import { OcpiParamsSchema } from '../../util/OcpiParams';

export const GetConnectorParamsSchema = OcpiParamsSchema.extend({
  locationId: z.string().length(36),
  evseUid: z.string().length(36),
  connectorId: z.string().length(36),
});

export type GetConnectorParams = z.infer<typeof GetConnectorParamsSchema>;
