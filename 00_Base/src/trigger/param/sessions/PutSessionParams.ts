import { z } from 'zod';
import { OcpiParamsSchema } from '../../util/OcpiParams';
import { SessionSchema } from '../../../model/Session';

export const PutSessionParamsSchema = OcpiParamsSchema.extend({
  sessionId: z.string().length(36),
  session: SessionSchema,
});

export type PutSessionParams = z.infer<typeof PutSessionParamsSchema>;
