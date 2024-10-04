import { IsInt, IsNotEmpty, IsNumber } from 'class-validator';
import { TariffDimensionType } from './TariffDimensionType';
import { Optional } from '../util/decorators/Optional';
import { Enum } from '../util/decorators/Enum';

export class PriceComponent {
  @Enum(TariffDimensionType, 'TariffDimensionType')
  @IsNotEmpty()
  type!: TariffDimensionType;

  @IsNumber()
  @IsNotEmpty()
  price!: number;

  @IsNumber()
  @Optional()
  vat?: number | null;

  @IsInt()
  @IsNotEmpty()
  step_size!: number;
}
