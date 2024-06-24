import { IsInt, IsNotEmpty, IsNumber } from 'class-validator';

export class ChargingProfilePeriod {
  @IsInt()
  @IsNotEmpty()
  start_period!: number;

  @IsNumber({ maxDecimalPlaces: 1 })
  @IsNotEmpty()
  limit!: number;
}
