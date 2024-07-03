import { OcpiParams } from '../../util/ocpi.params';
import { IsNotEmpty, IsString, Length, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import {TariffDTO} from "../../../model/DTO/TariffDTO";

export class PutTariffParams extends OcpiParams {
  @IsString()
  @IsNotEmpty()
  @Length(36, 36)
  tariffId!: string;

  @IsNotEmpty()
  @Type(() => TariffDTO)
  @ValidateNested()
  tariff!: TariffDTO;

  public constructor(params: PutTariffParams) {
    super();
    // noinspection TypeScriptValidateTypes
    Object.assign(this, params);
  }
}
