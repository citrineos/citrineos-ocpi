import { IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { OcpiResponse } from './ocpi.response';

export class OcpiStringResponse extends OcpiResponse<string> {
  @IsString()
  @IsNotEmpty()
  @ValidateNested() // needed for json schema
  data!: string;
}
