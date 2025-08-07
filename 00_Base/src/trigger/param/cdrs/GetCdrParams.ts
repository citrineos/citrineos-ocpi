import { z } from 'zod';
import { OcpiParamsSchema } from '../../util/OcpiParams';

export const GetCdrParamsSchema = OcpiParamsSchema.extend({
  url: z.string().url(),
});
