import { OcpiParams } from '../../util/ocpi.params';
import { IsNotEmpty, IsString, Length } from 'class-validator';
import { LocationDTO } from '../../../model/DTO/LocationDTO';

export class PatchLocationParams extends OcpiParams {
  @IsString()
  @IsNotEmpty()
  @Length(36, 36)
  locationId!: string;

  requestBody!: Partial<LocationDTO>;

  static build(
    locationId: number,
    location: Partial<LocationDTO>,
  ): PatchLocationParams {
    const params = new PatchLocationParams();
    params.locationId = String(locationId);
    params.requestBody = location;
    return params;
  }
}
