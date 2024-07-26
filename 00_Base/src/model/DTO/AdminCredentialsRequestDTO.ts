import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsString,
  IsUrl,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CredentialsRoleDTO } from './CredentialsRoleDTO';

export class AdminCredentialsRequestDTO {
  @IsString()
  @IsUrl({ require_tld: false })
  @IsNotEmpty()
  url!: string; // version url of OCPI

  @IsArray()
  @ArrayMinSize(1)
  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CredentialsRoleDTO)
  roles!: CredentialsRoleDTO[];

  constructor(url: string, roles: CredentialsRoleDTO[]) {
    this.url = url;
    this.roles = roles;
  }
}
