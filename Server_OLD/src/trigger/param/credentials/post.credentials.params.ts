import {IsNotEmpty, ValidateNested} from "class-validator";
import {buildOcpiRegistrationParams, OcpiRegistrationParams} from "../../../../../00_Base/src/trigger/util/ocpi.registration.params";
import {CredentialsDTO} from "../../../../../00_Base/src/model/CredentialsDTO";
import {Type} from "class-transformer";
import {VersionNumber} from "@citrineos/ocpi-base/dist/model/VersionNumber";

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
