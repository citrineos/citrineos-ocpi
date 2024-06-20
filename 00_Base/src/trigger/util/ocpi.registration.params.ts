import { IsOptional, IsString } from 'class-validator';
import { VersionNumber } from '../../model/VersionNumber';

export class OcpiRegistrationParams {
  @IsString()
  authorization!: string;

  @IsString()
  @IsOptional()
  xRequestId?: string;

  @IsString()
  @IsOptional()
  xCorrelationId?: string;

  version = VersionNumber.TWO_DOT_TWO_DOT_ONE;
}

export const buildOcpiRegistrationParams = (
  version: VersionNumber,
  authorization: string,
  xRequestId?: string,
  xCorrelationId?: string,
): OcpiRegistrationParams => {
  const params = new OcpiRegistrationParams();
  params.version = version;
  params.authorization = authorization;
  params.xRequestId = xRequestId;
  params.xCorrelationId = xCorrelationId;
  return params;
};
