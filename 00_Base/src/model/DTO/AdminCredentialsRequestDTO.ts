import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsString,
  IsUrl,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CredentialsRoleDTO } from './CredentialsRoleDTO';
import { CountryCode } from '../..';

export class AdminCredentialsRequestDTO {
  @IsString()
  @IsUrl({ require_tld: false })
  @IsNotEmpty()
  url!: string; // version url of OCPI

  @IsObject()
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => CredentialsRoleDTO)
  role!: CredentialsRoleDTO;

  @IsEnum(CountryCode)
  @IsNotEmpty()
  mspCountryCode!: CountryCode;

  @IsString()
  @IsNotEmpty()
  mspPartyId!: string;

  constructor(
    url: string,
    role: CredentialsRoleDTO,
    mspCountryCode: CountryCode,
    mspPartyId: string,
  ) {
    this.url = url;
    this.role = role;
    this.mspCountryCode = mspCountryCode;
    this.mspPartyId = mspPartyId;
  }
}
