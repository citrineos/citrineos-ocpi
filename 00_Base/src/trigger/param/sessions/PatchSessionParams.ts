import { OcpiParams } from '../../util/OcpiParams';
import { IsNotEmpty, IsString, Length } from 'class-validator';
import { Session } from '../../../model/Session';

export class PatchSessionParams extends OcpiParams {
  @IsString()
  @IsNotEmpty()
  @Length(36, 36)
  sessionId!: string;

  requestBody!: Partial<Session>;

  static build(sessionId: string, requestBody: Partial<Session>) {
    const params = new PatchSessionParams();
    params.sessionId = sessionId;
    params.requestBody = requestBody;
    return params;
  }
}
