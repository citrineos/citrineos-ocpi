import { z } from 'zod';
import { CredentialsRoleDTOSchema } from './CredentialsRoleDTO';

export const CredentialsDTOSchema = z.object({
  token: z.string().max(64),
  url: z.string().url(),
  roles: z.array(CredentialsRoleDTOSchema).min(1),
});

export type CredentialsDTO = z.infer<typeof CredentialsDTOSchema>;
