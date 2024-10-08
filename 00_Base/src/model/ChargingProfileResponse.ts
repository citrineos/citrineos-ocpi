import { IsInt, IsNotEmpty, IsObject, ValidateNested } from 'class-validator';
import { Enum } from '../util/decorators/Enum';
import { OcpiResponse } from './OcpiResponse';
import { Type } from 'class-transformer';

export enum ChargingProfileResultType {
  ACCEPTED = 'ACCEPTED',
  NOT_SUPPORTED = 'NOT_SUPPORTED',
  REJECTED = 'REJECTED',
  TOO_OFTEN = 'TOO_OFTEN',
  UNKNOWN_SESSION = 'UNKNOWN_SESSION',
}

export class ChargingProfileResponse {
  @Enum(ChargingProfileResultType, 'ChargingProfileResultType')
  @IsNotEmpty()
  result!: ChargingProfileResultType;

  @IsInt()
  @IsNotEmpty()
  timeout!: number;
}

export class ChargingProfileResponseResponse extends OcpiResponse<ChargingProfileResponse> {
  @IsObject()
  @IsNotEmpty()
  @Type(() => ChargingProfileResponse)
  @ValidateNested()
  data!: ChargingProfileResponse;
}
