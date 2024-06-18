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

  static build(
    fromCountryCode: string,
    fromPartyId: string,
    toCountryCode: string,
    toPartyId: string,
    sessionId: string,
    session: Session,
  ) {
    const params = new PutSessionParams();
    params.fromCountryCode = fromCountryCode;
    params.fromPartyId = fromPartyId;
    params.toCountryCode = toCountryCode;
    params.toPartyId = toPartyId;
    params.sessionId = sessionId;
    params.session = session;
    return params;
  }
}
