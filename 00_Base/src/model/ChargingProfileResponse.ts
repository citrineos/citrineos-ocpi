import { IsInt, IsNotEmpty } from 'class-validator';
import { Enum } from '../util/decorators/enum';

export enum ChargingProfileResponseType {
  ACCEPTED = 'ACCEPTED',
  NOT_SUPPORTED = 'NOT_SUPPORTED',
  REJECTED = 'REJECTED',
  TOO_OFTEN = 'TOO_OFTEN',
  UNKNOWN_SESSION = 'UNKNOWN_SESSION',
}

export class ChargingProfileResponse {
  @Enum(ChargingProfileResponseType, 'ChargingProfileResponseType')
  @IsNotEmpty()
  result!: ChargingProfileResponseType;

  @IsInt()
  @IsNotEmpty()
  timeout!: number;
}
