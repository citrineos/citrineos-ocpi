import { IsDateString, IsNotEmpty, IsString } from 'class-validator';
import { EvseStatus } from './EvseStatus';
import { Type } from 'class-transformer';
import { Optional } from '../util/decorators/Optional';
import { Enum } from '../util/decorators/Enum';

export class EvseStatusSchedule {
  @IsString()
  @IsDateString()
  @IsNotEmpty()
  @Type(() => Date)
  period_begin!: Date;

  @IsString()
  @IsDateString()
  @IsNotEmpty()
  @Optional()
  @Type(() => Date)
  period_end!: Date | null;

  @Enum(EvseStatus, 'EvseStatus')
  @IsNotEmpty()
  status!: EvseStatus;
}
