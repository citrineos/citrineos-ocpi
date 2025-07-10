import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { CdrDimension } from './CdrDimension';
import { Type } from 'class-transformer';
import { Optional } from '../util/decorators/Optional';

export class ChargingPeriod {
  @IsString()
  @IsDateString()
  @IsNotEmpty()
  @Type(() => Date)
  start_date_time!: Date;

  @ArrayMinSize(1)
  @IsArray()
  @IsNotEmpty()
  @Type(() => CdrDimension)
  @ValidateNested({ each: true })
  dimensions!: CdrDimension[];

  @MaxLength(36)
  @IsString()
  @Optional()
  tariff_id?: string | null;
}
