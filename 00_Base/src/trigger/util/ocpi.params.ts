import { IsNotEmpty, IsString, Length } from 'class-validator';
import { OcpiRegistrationParams } from './ocpi.registration.params';

export class OcpiParams extends OcpiRegistrationParams {
  @IsString()
  @IsNotEmpty()
  @Length(2)
  fromCountryCode!: string;

  @IsString()
  @IsNotEmpty()
  @Length(3)
  fromPartyId!: string;

  @IsString()
  @IsNotEmpty()
  @Length(2)
  toCountryCode!: string;

  @IsString()
  @IsNotEmpty()
  @Length(3)
  toPartyId!: string;
}
