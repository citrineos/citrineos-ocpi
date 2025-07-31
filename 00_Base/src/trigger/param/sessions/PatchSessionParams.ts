import { z } from 'zod';
import { OcpiParamsSchema } from '../../util/OcpiParams';
import { SessionSchema } from '../../../model/Session';

export const PatchSessionParamsSchema = OcpiParamsSchema.extend({
  sessionId: z.string().length(36),
  requestBody: SessionSchema.partial(),
});

export type PatchSessionParams = z.infer<typeof PatchSessionParamsSchema>;
