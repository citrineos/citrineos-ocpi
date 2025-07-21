import { Role } from './Role';
import { ICredentialsRole } from './BaseCredentialsRole';
import { IsNotEmpty, IsString, Length } from 'class-validator';
import { CpoTenant } from './CpoTenant';
import { Exclude } from 'class-transformer';
import { CredentialsRoleDTO } from './DTO/CredentialsRoleDTO';
import { BusinessDetails } from './BusinessDetails';

export enum ServerCredentialsRoleProps {
  role = 'role',
  partyId = 'party_id',
  countryCode = 'country_code',
  businessDetails = 'business_details',
  cpoTenantId = 'cpoTenantId',
  cpoTenant = 'cpoTenant',
}

export class ServerCredentialsRole implements ICredentialsRole {
  [ServerCredentialsRoleProps.role] = Role.CPO;

  @IsString()
  @IsNotEmpty()
  @Length(3, 3)
  [ServerCredentialsRoleProps.partyId]!: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 2)
  [ServerCredentialsRoleProps.countryCode]!: string;

  @Exclude()
  [ServerCredentialsRoleProps.businessDetails]!: BusinessDetails;

  @Exclude()
  [ServerCredentialsRoleProps.cpoTenantId]!: number;

  @Exclude()
  [ServerCredentialsRoleProps.cpoTenant]!: CpoTenant;

  static buildServerCredentialsRole(
    countryCode: string,
    partyId: string,
    businessDetails: BusinessDetails,
  ) {
    const serverCredentialsRole = new ServerCredentialsRole();
    serverCredentialsRole.country_code = countryCode;
    serverCredentialsRole.party_id = partyId;
    serverCredentialsRole.business_details = businessDetails;
    return serverCredentialsRole;
  }

  static toCredentialsRoleDTO(
    serverCredentialsRole: ServerCredentialsRole,
  ): CredentialsRoleDTO {
    const credentialsRoleDTO = new CredentialsRoleDTO();
    credentialsRoleDTO.role =
      serverCredentialsRole[ServerCredentialsRoleProps.role];
    credentialsRoleDTO.party_id =
      serverCredentialsRole[ServerCredentialsRoleProps.partyId];
    credentialsRoleDTO.country_code =
      serverCredentialsRole[ServerCredentialsRoleProps.countryCode];
    if (serverCredentialsRole[ServerCredentialsRoleProps.businessDetails]) {
      credentialsRoleDTO.business_details = toBusinessDetailsDTO(
        serverCredentialsRole[ServerCredentialsRoleProps.businessDetails],
      );
    }
    return credentialsRoleDTO;
  }
}
