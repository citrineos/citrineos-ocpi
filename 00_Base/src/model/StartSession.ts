import { z } from 'zod';
import { TokenDTOSchema } from './DTO/TokenDTO';
import { ResponseUrlSchema } from './ResponseUrl';

export const StartSessionSchema = ResponseUrlSchema.extend({
  token: TokenDTOSchema,
  location_id: z.string().max(36),
  evse_uid: z.string().max(36).nullable().optional(),
  connector_id: z.string().max(36).nullable().optional(),
  authorization_reference: z.string().max(36).nullable().optional(),
});

export type StartSession = z.infer<typeof StartSessionSchema>;
