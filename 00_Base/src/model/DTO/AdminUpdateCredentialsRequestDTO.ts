import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { CredentialsRoleDTO } from './CredentialsRoleDTO';
import { AdminCredentialsRequestDTO } from './AdminCredentialsRequestDTO';
import { CountryCode } from '../../util/Util';

export class AdminUpdateCredentialsRequestDTO extends AdminCredentialsRequestDTO {
  @IsEnum(CountryCode)
  @IsNotEmpty()
  mspCountryCode!: CountryCode;

  @IsString()
  @IsNotEmpty()
  mspPartyId!: string;

  @IsEnum(CountryCode)
  @IsNotEmpty()
  cpoCountryCode!: CountryCode;

  @IsString()
  @IsNotEmpty()
  cpoPartyId!: string;

  constructor(
    url: string,
    roles: CredentialsRoleDTO[],
    mspCountryCode: CountryCode,
    mspPartyId: string,
    cpoCountryCode: CountryCode,
    cpoPartyId: string,
  ) {
    super(url, roles);
    this.mspCountryCode = mspCountryCode;
    this.mspPartyId = mspPartyId;
    this.cpoCountryCode = cpoCountryCode;
    this.cpoPartyId = cpoPartyId;
  }
}
