import { Role } from './Role';
import { ICredentialsRole } from './BaseCredentialsRole';
import { IsNotEmpty, IsString, Length } from 'class-validator';
import { ClientInformation } from './ClientInformation';
import { CpoTenant } from './CpoTenant';
import {
  BusinessDetails,
  fromBusinessDetailsDTO,
  toBusinessDetailsDTO,
} from './BusinessDetails';
import { Exclude } from 'class-transformer';
import { CredentialsRoleDTO } from './DTO/CredentialsRoleDTO';

export enum ClientCredentialsRoleProps {
  role = 'role',
  partyId = 'party_id',
  countryCode = 'country_code',
  businessDetails = 'business_details',
  clientInformationId = 'clientInformationId',
  clientInformation = 'clientInformation',
  cpoTenantId = 'cpoTenantId',
  cpoTenant = 'cpoTenant',
}

export class ClientCredentialsRole implements ICredentialsRole {
  [ClientCredentialsRoleProps.role] = Role.EMSP;

  @IsString()
  @IsNotEmpty()
  @Length(3, 3)
  [ClientCredentialsRoleProps.partyId]!: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 2)
  [ClientCredentialsRoleProps.countryCode]!: string; // todo should we use CountryCode enum?

  @Exclude()
  [ClientCredentialsRoleProps.businessDetails]!: BusinessDetails;

  @Exclude()
  [ClientCredentialsRoleProps.clientInformationId]!: number;

  @Exclude()
  [ClientCredentialsRoleProps.clientInformation]!: ClientInformation;

  @Exclude()
  [ClientCredentialsRoleProps.cpoTenantId]!: number;

  @Exclude()
  [ClientCredentialsRoleProps.cpoTenant]!: CpoTenant;

  static fromDto(credentialsRole: CredentialsRoleDTO) {
    return credentialsRole as Partial<ClientCredentialsRole>;
  }
}

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

export const fromCredentialsRoleDTO = (role: CredentialsRoleDTO): any => {
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
