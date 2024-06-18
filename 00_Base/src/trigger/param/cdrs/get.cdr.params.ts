import {IsNotEmpty, IsString} from 'class-validator';
import {OcpiParams} from "../../util/ocpi.params";

export class GetCdrParams extends OcpiParams {
  @IsNotEmpty()
  @IsString()
  url!: string;
}
