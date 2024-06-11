import {IsNotEmpty, ValidateNested} from "class-validator";
import {buildOcpiRegistrationParams, OcpiRegistrationParams} from "../../util/ocpi.registration.params";
import {CredentialsDTO} from "../../../model/CredentialsDTO";
import {Type} from "class-transformer";
import {VersionNumber} from "../../../model/VersionNumber";

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
    xCorrelationId
  );
  (params as PostCredentialsParams).credentials = credentials;
  return params as PostCredentialsParams;
};
