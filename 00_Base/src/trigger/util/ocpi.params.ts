import {IsNotEmpty, IsString, Length} from 'class-validator';
import {OcpiRegistrationParams} from './ocpi.registration.params';
import {VersionNumber} from "../../model/VersionNumber";

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


  constructor(
    fromCountryCode?: string,
    fromPartyId?: string,
    toCountryCode?: string,
    toPartyId?: string,
    authorization?: string,
    xRequestId?: string,
    xCorrelationId?: string,
    version?: VersionNumber
  ) {
    super(authorization, xRequestId, xCorrelationId, version);
    this.fromCountryCode = fromCountryCode!;
    this.fromPartyId = fromPartyId!;
    this.toCountryCode = toCountryCode!;
    this.toPartyId = toPartyId!;
  }
}
