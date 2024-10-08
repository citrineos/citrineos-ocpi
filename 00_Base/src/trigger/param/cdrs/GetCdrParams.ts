import { IsNotEmpty, IsString } from 'class-validator';
import { OcpiParams } from '../../util/OcpiParams';

export class GetCdrParams extends OcpiParams {
  @IsNotEmpty()
  @IsString()
  url!: string;
}
