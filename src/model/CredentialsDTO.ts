import {ArrayMinSize, IsArray, IsNotEmpty, IsString, IsUrl, MaxLength, ValidateNested,} from 'class-validator';
import {Index} from 'sequelize-typescript';
import {CredentialsRole} from './CredentialsRole';
import {Type} from 'class-transformer';

export class CredentialsDTO {

  @Index
  @MaxLength(64)
  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsString()
  @IsUrl({require_tld: false})
  @IsNotEmpty()
  url!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsNotEmpty()
  @ValidateNested({each: true})
  @Type(() => CredentialsRole)
  roles!: CredentialsRole[];

  static build(token: string, url: string, roles: CredentialsRole[]): CredentialsDTO {
    const credentials = new CredentialsDTO();
    credentials.token = token;
    credentials.url = url;
    credentials.roles = roles;
    return credentials;
  }

}
