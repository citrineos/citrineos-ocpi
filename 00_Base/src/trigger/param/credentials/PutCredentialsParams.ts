import { IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CredentialsDTO } from '../../../model/DTO/CredentialsDTO';
import { VersionNumber } from '../../../model/VersionNumber';
import { OcpiRegistrationParams } from '../../util/OcpiRegistrationParams';

export class PutCredentialsParams extends OcpiRegistrationParams {
  @IsNotEmpty()
  @Type(() => CredentialsDTO)
  @ValidateNested()
  credentials!: CredentialsDTO;
}

export const buildPutCredentialsParams = (
  version: VersionNumber,
  authorization: string,
  credentials: CredentialsDTO,
): PutCredentialsParams => {
  const ocpiParams = new OcpiRegistrationParams(
    authorization,
    undefined,
    undefined,
    version,
  );
  (ocpiParams as PutCredentialsParams).credentials = credentials;
  return ocpiParams as PutCredentialsParams;
};
