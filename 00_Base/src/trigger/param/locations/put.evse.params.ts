import { OcpiParams } from '../../util/ocpi.params';
import { IsNotEmpty, IsString, Length, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { EvseDTO } from '../../../model/DTO/EvseDTO';

export class PutEvseParams extends OcpiParams {
  @IsString()
  @IsNotEmpty()
  @Length(36, 36)
  locationId!: string;

  @IsString()
  @IsNotEmpty()
  @Length(36, 36)
  evseUid!: string;

  @IsNotEmpty()
  @Type(() => EvseDTO)
  @ValidateNested()
  evse!: EvseDTO;

  static build(
    locationId: number,
    evseUid: string,
    evse: EvseDTO,
  ): PutEvseParams {
    const params = new PutEvseParams();
    params.locationId = String(locationId);
    params.evseUid = evseUid;
    params.evse = evse;
    return params;
  }
}
