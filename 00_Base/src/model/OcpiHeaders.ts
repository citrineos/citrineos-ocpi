import { IsNotEmpty, IsString, Length } from 'class-validator';

export class OcpiHeaders {
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

  constructor(
    fromCountryCode: string,
    fromPartyId: string,
    toCountryCode: string,
    toPartyId: string,
  ) {
    this.fromCountryCode = fromCountryCode;
    this.fromPartyId = fromPartyId;
    this.toCountryCode = toCountryCode;
    this.toPartyId = toPartyId;
  }
}
