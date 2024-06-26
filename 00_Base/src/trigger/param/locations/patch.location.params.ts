import { OcpiParams } from '../../util/ocpi.params';
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class PatchLocationParams extends OcpiParams {
  @IsString()
  @IsNotEmpty()
  @Length(36, 36)
  locationId!: string;

  requestBody!: { [key: string]: object };

  static build(
    locationId: number,
    location: object
  ): PatchLocationParams {
    const params = new PatchLocationParams();
    params.locationId = String(locationId);
    params.requestBody = {...location};
    return params;
  }
}
