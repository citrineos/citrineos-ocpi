import { Enum } from '../../util/decorators/Enum';
import { Role } from '../Role';
import { IsNotEmpty, IsString, Length, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { BusinessDetailsDTO } from './BusinessDetailsDTO';

export class CredentialsRoleDTO {
  @Enum(Role, 'Role')
  @IsNotEmpty()
  role!: Role;

  @IsString()
  @IsNotEmpty()
  @Length(3, 3)
  party_id!: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 2)
  country_code!: string; // todo should we use CountryCode enum?

  @IsNotEmpty()
  @Type(() => BusinessDetailsDTO)
  @ValidateNested()
  business_details!: BusinessDetailsDTO;

  static build(
    role: Role,
    party_id: string,
    country_code: string,
    business_details: BusinessDetailsDTO,
  ): CredentialsRoleDTO {
    const credentialsRole = new CredentialsRoleDTO();
    credentialsRole.role = role;
    credentialsRole.party_id = party_id;
    credentialsRole.country_code = country_code;
    credentialsRole.business_details = business_details;
    return credentialsRole;
  }
}
