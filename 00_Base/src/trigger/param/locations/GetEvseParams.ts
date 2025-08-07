import { z } from 'zod';
import { OcpiParamsSchema } from '../../util/OcpiParams';

export const GetEvseParamsSchema = OcpiParamsSchema.extend({
  locationId: z.string().length(36),
  evseUid: z.string().length(36),
});

export type GetEvseParams = z.infer<typeof GetEvseParamsSchema>;
