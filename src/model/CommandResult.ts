import {Enum} from '../util/decorators/enum';
import {IsNotEmpty, ValidateNested} from 'class-validator';
import {Optional} from '../util/decorators/optional';
import {Type} from 'class-transformer';
import {DisplayText} from './DisplayText';
import {OcpiResponse} from './ocpi.response';

export enum CommandResultType {
  ACCEPTED = 'ACCEPTED',
  CANCELED_RESERVATION = 'CANCELED_RESERVATION',
  EVSE_OCCUPIED = 'EVSE_OCCUPIED',
  EVSE_INOPERATIVE = 'EVSE_INOPERATIVE',
  FAILED = 'FAILED',
  NOT_SUPPORTED = 'NOT_SUPPORTED',
  REJECTED = 'REJECTED',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN_RESERVATION = 'UNKNOWN_RESERVATION',
}

export class CommandResult {
  @Enum(CommandResultType, 'CommandResultType')
  @IsNotEmpty()
  result!: CommandResultType;

  @Optional()
  @Type(() => DisplayText)
  @ValidateNested()
  message?: DisplayText;
}

export class OcpiCommandResult extends OcpiResponse<CommandResult> {
  @IsNotEmpty()
  @Type(() => CommandResult)
  @ValidateNested()
  data!: CommandResult;
}
