import { OcpiParams } from '../../util/ocpi.params';
import { IsNotEmpty, IsString, IsUrl, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ActiveChargingProfile } from '../../../model/ActiveChargingProfile';
import { buildOcpiRegistrationParams } from '../../util/ocpi.registration.params';
import { VersionNumber } from '../../../model/VersionNumber';

export class PutChargingProfileParams extends OcpiParams {
  @IsString()
  @IsNotEmpty()
  @IsUrl({ require_tld: false })
  url!: string;

  @IsNotEmpty()
  @Type(() => ActiveChargingProfile)
  @ValidateNested()
  activeChargingProfile!: ActiveChargingProfile;
}

export const buildPutChargingProfileParams = (
  url: string,
  activeChargingProfile: ActiveChargingProfile,
  token: string,
  fromCountryCode: string,
  fromPartyId: string,
  toCountryCode: string,
  toPartyId: string,
): PutChargingProfileParams => {
  const params = buildOcpiRegistrationParams(
    VersionNumber.TWO_DOT_TWO_DOT_ONE,
    token,
  );
  (params as OcpiParams).fromCountryCode = fromCountryCode;
  (params as OcpiParams).fromPartyId = fromPartyId;
  (params as OcpiParams).toCountryCode = toCountryCode;
  (params as OcpiParams).toPartyId = toPartyId;
  (params as PutChargingProfileParams).activeChargingProfile =
    activeChargingProfile;
  (params as PutChargingProfileParams).url = url;
  console.log(
    `Built PutChargingProfileParams: ${JSON.stringify(params as PutChargingProfileParams)}`,
  );
  return params as PutChargingProfileParams;
};
