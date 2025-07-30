import { z } from 'zod';
import { CredentialsDTOSchema } from './DTO/CredentialsDTO';
import { OcpiResponseSchema } from './OcpiResponse';

export const CredentialsResponseSchema =
  OcpiResponseSchema(CredentialsDTOSchema);

export type CredentialsResponse = z.infer<typeof CredentialsResponseSchema>;
