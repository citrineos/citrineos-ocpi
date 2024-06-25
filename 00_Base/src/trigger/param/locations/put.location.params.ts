import { OcpiParams } from '../../util/ocpi.params';
import { IsNotEmpty, IsString, Length, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { LocationDTO } from '../../../model/DTO/LocationDTO';

export class PutLocationParams extends OcpiParams {
  @IsString()
  @IsNotEmpty()
  @Length(36, 36)
  locationId!: string;

  @IsNotEmpty()
  @Type(() => LocationDTO)
  @ValidateNested()
  location!: LocationDTO;

  static build(
    locationId: number,
    location: LocationDTO
  ): PutLocationParams {
    const params = new PutLocationParams();
    params.locationId = String(locationId);
    params.location = location;
    return params;
  }
}
