import { z } from 'zod';
import { CredentialsRoleDTOSchema } from './CredentialsRoleDTO';
import { CountryCode } from '../../util/Util';

export const AdminCredentialsRequestDTOSchema = z.object({
  url: z.string().url(),
  role: CredentialsRoleDTOSchema,
  mspCountryCode: z.nativeEnum(CountryCode),
  mspPartyId: z.string(),
});
export type AdminCredentialsRequestDTO = z.infer<
  typeof AdminCredentialsRequestDTOSchema
>;
