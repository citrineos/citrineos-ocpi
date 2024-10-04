import { OcpiParams } from '../../util/OcpiParams';
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class GetLocationParams extends OcpiParams {
  @IsString()
  @IsNotEmpty()
  @Length(36, 36)
  locationId!: string;
}
