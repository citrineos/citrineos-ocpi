import { IsNotEmpty } from 'class-validator';
import { Enum } from '../util/decorators/enum';

export enum ChargingProfileResultType {
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  UNKNOWN = 'UNKNOWN',
}

export class ChargingProfileResult {
  @Enum(ChargingProfileResultType, 'ChargingProfileResultType')
  @IsNotEmpty()
  result!: ChargingProfileResultType;
}
