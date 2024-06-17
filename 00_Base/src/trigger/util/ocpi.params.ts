import { IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';
import { VersionNumber } from '../../model/VersionNumber';

export class OcpiParams {
  @IsString()
  authorization!: string;

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

  @IsString()
  @IsOptional()
  xRequestId?: string;

  @IsString()
  @IsOptional()
  xCorrelationId?: string;

  version = VersionNumber.TWO_DOT_TWO_DOT_ONE;
}
