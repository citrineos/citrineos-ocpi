import {IsInt, IsNotEmpty, ValidateNested} from 'class-validator';
import {Displaytext} from './Displaytext';
import {Type} from 'class-transformer';
import {Optional} from '../util/decorators/optional';
import {Enum} from '../util/decorators/enum';
import {OcpiResponse} from './ocpi.response';

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
  @Type(() => Displaytext)
  @ValidateNested()
  message?: Displaytext;
}

export class OcpiCommandResponse extends OcpiResponse<CommandResponse> {
  @IsNotEmpty()
  @Type(() => CommandResponse)
  @ValidateNested()
  data!: CommandResponse;
}
