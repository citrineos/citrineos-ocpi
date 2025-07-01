import { IsArray, IsDateString, IsInt, IsNotEmpty, IsNumber, IsString, ValidateNested } from 'class-validator';
import { ChargingProfilePeriod } from './ChargingProfilePeriod';
import { Type } from 'class-transformer';
import { Optional } from '../util/decorators/Optional';

export class ChargingProfile {
  @IsString()
  @IsDateString()
  @Optional()
  start_date_time?: Date | null;

  @IsInt()
  @Optional()
  duration?: number | null;

  @IsString()
  @IsNotEmpty()
  charging_rate_unit!: string;

  @IsNumber({ maxDecimalPlaces: 1 })
  @Optional()
  min_charging_rate?: number | null;

  @IsArray()
  @Optional()
  @Type(() => ChargingProfilePeriod)
  @ValidateNested({ each: true })
  charging_profile_period?: ChargingProfilePeriod[] | null;
}
