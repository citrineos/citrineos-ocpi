import { OcpiParams } from '../../util/OcpiParams';
import { IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { Cdr } from '../../../model/Cdr';

export class PostCdrParams extends OcpiParams {
  @IsNotEmpty()
  @Type(() => Cdr)
  @ValidateNested()
  cdr!: Cdr;

  static build(cdr: Cdr) {
    const params = new PostCdrParams();
    params.cdr = cdr;
    return params;
  }
}
