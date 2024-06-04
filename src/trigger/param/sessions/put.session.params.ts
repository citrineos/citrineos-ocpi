import { OcpiParams } from '../../util/ocpi.params';
import { Session } from '../../../model/Session';
import { IsNotEmpty, IsString, Length, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class PutSessionParams extends OcpiParams {
  @IsString()
  @IsNotEmpty()
  @Length(36, 36)
  sessionId!: string;

  @IsNotEmpty()
  @Type(() => Session)
  @ValidateNested()
  session!: Session;
}
