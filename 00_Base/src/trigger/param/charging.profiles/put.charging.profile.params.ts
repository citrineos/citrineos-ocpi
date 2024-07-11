import { OcpiParams } from '../../util/ocpi.params';
import { IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ActiveChargingProfile } from '../../../model/ActiveChargingProfile';

export class PutChargingProfileParams extends OcpiParams {
  @IsString()
  @IsNotEmpty()
  sessionId!: string;

  @IsNotEmpty()
  @Type(() => ActiveChargingProfile)
  @ValidateNested()
  activeChargingProfile!: ActiveChargingProfile;
}

export const buildPutChargingProfileParams = (
  sessionId: string,
  activeChargingProfile: ActiveChargingProfile,
  fromCountryCode: string,
  fromPartyId: string,
  toCountryCode: string,
  toPartyId: string,
): PutChargingProfileParams => {
  const ocpiParams = new OcpiParams(
    fromCountryCode,
    fromPartyId,
    toCountryCode,
    toPartyId,
  );
  (ocpiParams as PutChargingProfileParams).sessionId = sessionId;
  (ocpiParams as PutChargingProfileParams).activeChargingProfile =
    activeChargingProfile;
  return ocpiParams as PutChargingProfileParams;
};
