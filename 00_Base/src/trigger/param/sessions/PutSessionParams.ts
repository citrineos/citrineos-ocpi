import { OcpiParams } from '../../util/OcpiParams';
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

  static build(sessionId: string, session: Session) {
    const params = new PutSessionParams();
    params.sessionId = sessionId;
    params.session = session;
    return params;
  }
}
