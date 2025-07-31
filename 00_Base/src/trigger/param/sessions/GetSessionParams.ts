import { z } from 'zod';
import { OcpiParamsSchema } from '../../util/OcpiParams';

export const GetSessionParamsSchema = OcpiParamsSchema.extend({
  sessionId: z.string().length(36),
});

export type GetSessionParams = z.infer<typeof GetSessionParamsSchema>;
