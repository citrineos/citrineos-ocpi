import { OcpiParams } from '../../util/ocpi.params';
import { IsNotEmpty, IsString, IsUrl, Length } from 'class-validator';

export class DeleteChargingProfileParams extends OcpiParams {
  @IsString()
  @IsNotEmpty()
  @Length(36, 36)
  sessionId!: string;

  @IsString()
  @IsNotEmpty()
  @IsUrl({require_tld: false})
  responseUrl!: string;
}
