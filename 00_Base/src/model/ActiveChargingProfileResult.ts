import { IsNotEmpty, ValidateNested } from 'class-validator';
import { ActiveChargingProfile } from './ActiveChargingProfile';
import { ChargingProfileResultType } from './ChargingProfileResult';
import { Type } from 'class-transformer';
import { Optional } from '../util/decorators/Optional';
import { Enum } from '../util/decorators/Enum';

export class ActiveChargingProfileResult {
  @Enum(ChargingProfileResultType, 'ChargingProfileResultType')
  @IsNotEmpty()
  result!: ChargingProfileResultType;

  @Optional()
  @Type(() => ActiveChargingProfile)
  @ValidateNested()
  profile?: ActiveChargingProfile | null;
}
