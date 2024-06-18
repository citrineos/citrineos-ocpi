import { OcpiParams } from '../../util/ocpi.params';
import { IsNotEmpty, IsString, Length, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { Tariff } from '../../../model/Tariff';

export class PutTariffParams extends OcpiParams {
  @IsString()
  @IsNotEmpty()
  @Length(36, 36)
  tariffId!: string;

  @IsNotEmpty()
  @Type(() => Tariff)
  @ValidateNested()
  tariff!: Tariff;
}
