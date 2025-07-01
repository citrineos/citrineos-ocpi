import { IsInt, IsNotEmpty, ValidateNested } from 'class-validator';
import { DisplayText } from './DisplayText';
import { Type } from 'class-transformer';
import { Optional } from '../util/decorators/Optional';
import { Enum } from '../util/decorators/Enum';
import { OcpiResponse } from './OcpiResponse';

export enum CommandResponseType {
  NOT_SUPPORTED = 'NOT_SUPPORTED',
  REJECTED = 'REJECTED',
  ACCEPTED = 'ACCEPTED',
  UNKNOWN_SESSION = 'UNKNOWN_SESSION',
}

export class CommandResponse {
  @Enum(CommandResponseType, 'CommandResponseType')
  @IsNotEmpty()
  result!: CommandResponseType;

  @IsInt()
  @IsNotEmpty()
  timeout!: number;

  @Optional()
  @Type(() => DisplayText)
  @ValidateNested()
  message?: DisplayText;
}

export class OcpiCommandResponse extends OcpiResponse<CommandResponse> {
  @IsNotEmpty()
  @Type(() => CommandResponse)
  @ValidateNested()
  data!: CommandResponse;
}
