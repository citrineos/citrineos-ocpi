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

export class CredentialsRequestDTO {
  @IsString()
  @IsUrl({ require_tld: false })
  @IsNotEmpty()
  url!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CredentialsRoleDTO)
  roles!: CredentialsRoleDTO[];

  static build(
    token: string,
    url: string,
    roles: CredentialsRoleDTO[],
  ): CredentialsRequestDTO {
    const credentials = new CredentialsRequestDTO();
    credentials.url = url;
    credentials.roles = roles;
    return credentials;
  }
}
