import { OcpiParams } from '../../util/ocpi.params';
import { IsNotEmpty, IsString, Length } from 'class-validator';
import { EvseDTO } from "../../../model/DTO/EvseDTO";

export class PatchEvseParams extends OcpiParams {
  @IsString()
  @IsNotEmpty()
  @Length(36, 36)
  locationId!: string;

  @IsString()
  @IsNotEmpty()
  @Length(36, 36)
  evseUid!: string;

  requestBody!: { [key: string]: object };

  static build(
    locationId: number,
    evseUid: string,
    evse: object
  ): PatchEvseParams {
    const params = new PatchEvseParams();
    params.locationId = String(locationId);
    params.evseUid = evseUid;
    params.requestBody = {...evse};
    return params;
  }
}
