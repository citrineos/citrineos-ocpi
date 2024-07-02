import {IsOptional, IsString} from 'class-validator';
import {VersionNumber} from '../../model/VersionNumber';

export class OcpiRegistrationParams {
  @IsString()
  authorization!: string;

  @IsString()
  @IsOptional()
  xRequestId?: string;

  @IsString()
  @IsOptional()
  xCorrelationId?: string;

  version?: VersionNumber = VersionNumber.TWO_DOT_TWO_DOT_ONE;


  constructor(
    authorization?: string,
    xRequestId?: string,
    xCorrelationId?: string,
    version?: VersionNumber
  ) {
    this.authorization = authorization!;
    this.xRequestId = xRequestId;
    this.xCorrelationId = xCorrelationId;
    this.version = version;
  }
}

export const buildOcpiRegistrationParams = (
  version: VersionNumber,
  authorization: string,
  xRequestId?: string,
  xCorrelationId?: string,
): OcpiRegistrationParams => {
  return new OcpiRegistrationParams(
    authorization,
    xRequestId,
    xCorrelationId,
    version
  );
};
