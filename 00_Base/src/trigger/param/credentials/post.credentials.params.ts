import {
  buildOcpiRegistrationParams,
  OcpiRegistrationParams,
} from '../../util/ocpi.registration.params';
import { IsNotEmpty, ValidateNested } from 'class-validator';
import { CredentialsDTO } from '../../../model/DTO/CredentialsDTO';
import { VersionNumber } from '../../../model/VersionNumber';
import { Type } from 'class-transformer';

export class PostCredentialsParams extends OcpiRegistrationParams {
  @IsNotEmpty()
  @Type(() => CredentialsDTO)
  @ValidateNested()
  credentials!: CredentialsDTO;
}

export const buildPostCredentialsParams = (
  version: VersionNumber,
  authorization: string,
  credentials: CredentialsDTO,
  xRequestId?: string,
  xCorrelationId?: string,
): PostCredentialsParams => {
  const params: OcpiRegistrationParams = buildOcpiRegistrationParams(
    version,
    authorization,
    xRequestId,
    xCorrelationId,
  );
  (params as PostCredentialsParams).credentials = credentials;
  return params as PostCredentialsParams;
};
