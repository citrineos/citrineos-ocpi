import { Role } from './Role';
import { ClientInformation } from './ClientInformation';
import { CpoTenant } from './CpoTenant';
import {
  BusinessDetailsSchema,
  fromBusinessDetailsDTO,
  toBusinessDetailsDTO,
} from './BusinessDetails';
import { CredentialsRoleDTO } from './DTO/CredentialsRoleDTO';

import { z } from 'zod';
import { CountryCode } from '../util/Util';

export const ClientCredentialsRoleSchema = z.object({
  role: z.literal(Role.EMSP),
  party_id: z.string().length(3),
  country_code: z.nativeEnum(CountryCode),
  business_details: BusinessDetailsSchema,
  clientInformationId: z.number(),
  clientInformation: z.custom<ClientInformation>(),
  cpoTenantId: z.number(),
  cpoTenant: z.custom<CpoTenant>(),
});

export type ClientCredentialsRole = z.infer<typeof ClientCredentialsRoleSchema>;

export const toCredentialsRoleDTO = (
  clientCredentialsRole: ClientCredentialsRole,
): CredentialsRoleDTO => {
  const credentialsRoleDTO = new CredentialsRoleDTO();
  credentialsRoleDTO.role = clientCredentialsRole.role;
  credentialsRoleDTO.party_id = clientCredentialsRole.party_id;
  credentialsRoleDTO.country_code = clientCredentialsRole.country_code;
  if (clientCredentialsRole.business_details) {
    credentialsRoleDTO.business_details = toBusinessDetailsDTO(
      clientCredentialsRole.business_details,
    );
  }
  return credentialsRoleDTO;
};

export const fromCredentialsRoleDTO = (
  role: CredentialsRoleDTO,
): ClientCredentialsRole => {
  const record: any = {
    role: role.role,
    party_id: role.party_id,
    country_code: role.country_code,
  };
  const clientCredentialsRole = record;
  if (role.business_details) {
    clientCredentialsRole.setDataValue(
      'business_details',
      fromBusinessDetailsDTO(role.business_details),
    );
  }
  return clientCredentialsRole;
};
