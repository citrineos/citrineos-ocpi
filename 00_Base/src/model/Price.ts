import { IsNotEmpty, IsNumber } from 'class-validator';
import { Optional } from '../util/decorators/Optional';

export class Price {
  @IsNumber()
  @IsNotEmpty()
  excl_vat!: number;

  @IsNumber()
  @Optional()
  incl_vat?: number | null;
}
