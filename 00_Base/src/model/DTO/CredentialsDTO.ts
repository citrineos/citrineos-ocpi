import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsString,
  IsUrl,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Index } from '@citrineos/data';
import { Type } from 'class-transformer';
import { CredentialsRoleDTO } from './CredentialsRoleDTO';

export class CredentialsDTO {
  @Index
  @MaxLength(64)
  @IsString()
  @IsNotEmpty()
  token!: string;

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
  ): CredentialsDTO {
    const credentials = new CredentialsDTO();
    credentials.token = token;
    credentials.url = url;
    credentials.roles = roles;
    return credentials;
  }
}
