import {OcpiParams} from '../../util/ocpi.params';
import {IsNotEmpty, IsString, Length} from 'class-validator';

export class GetSessionParams extends OcpiParams {
  @IsString()
  @IsNotEmpty()
  @Length(36, 36)
  sessionId!: string;
}
