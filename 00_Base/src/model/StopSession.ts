import { z } from 'zod';
import { ResponseUrlSchema } from './ResponseUrl';

export const StopSessionSchema = ResponseUrlSchema.extend({
  session_id: z.string().max(36).min(1),
});
export const StopSessionSchemaName = 'StopSession';

export type StopSession = z.infer<typeof StopSessionSchema>;
