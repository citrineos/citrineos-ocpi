import { OcpiParams } from '../../util/OcpiParams';
import { IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CommandResult } from '../../../model/CommandResult';

export class PostCommandParams extends OcpiParams {
  @IsNotEmpty()
  @IsString()
  url!: string;

  @IsNotEmpty()
  @Type(() => CommandResult)
  @ValidateNested()
  commandResult!: CommandResult;
}
