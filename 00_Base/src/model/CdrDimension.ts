import { IsNotEmpty, IsNumber } from 'class-validator';
import { CdrDimensionType } from './CdrDimensionType';
import { Enum } from '../util/decorators/Enum';

export class CdrDimension {
  @Enum(CdrDimensionType, 'CdrDimensionType')
  @IsNotEmpty()
  type!: CdrDimensionType;

  @IsNumber()
  @IsNotEmpty()
  volume!: number;
}
