import { z } from 'zod';
import { OcpiParamsSchema } from '../../util/OcpiParams';

export const GetLocationParamsSchema = OcpiParamsSchema.extend({
  locationId: z.string().length(36),
});

export type GetLocationParams = z.infer<typeof GetLocationParamsSchema>;
