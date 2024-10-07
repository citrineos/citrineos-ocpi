import { Enum } from '../util/decorators/Enum';
import { IsBoolean, IsDateString, IsNumber } from 'class-validator';
import { ProfileType } from './ProfileType';
import { Optional } from '../util/decorators/Optional';

export class ChargingPreferences {
  @Enum(ProfileType, 'ProfileType')
  profile_type!: ProfileType;

  @IsDateString()
  departure_time?: Date;

  @IsNumber()
  @Optional()
  energy_need?: number;

  @IsBoolean()
  @Optional()
  discharge_allowed?: boolean;
}
