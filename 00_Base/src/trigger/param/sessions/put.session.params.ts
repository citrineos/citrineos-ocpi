import {OcpiParams} from '../../util/ocpi.params';
import {Session} from '../../../model/Session';
import {IsNotEmpty, IsString, Length, ValidateNested} from 'class-validator';
import {Type} from 'class-transformer';
import {VersionNumber} from "../../../model/VersionNumber";

export class PutSessionParams extends OcpiParams {
  @IsString()
  @IsNotEmpty()
  @Length(36, 36)
  sessionId!: string;

  @IsNotEmpty()
  @Type(() => Session)
  @ValidateNested()
  session!: Session;


  constructor(
    fromCountryCode?: string,
    fromPartyId?: string,
    toCountryCode?: string,
    toPartyId?: string,
    authorization?: string,
    xRequestId?: string,
    xCorrelationId?: string,
    version?: VersionNumber,
    sessionId?: string,
    session?: Session
  ) {
    super(fromCountryCode, fromPartyId, toCountryCode, toPartyId, authorization, xRequestId, xCorrelationId, version);
    this.sessionId = sessionId!;
    this.session = session!;
  }

  static build(
    fromCountryCode: string,
    fromPartyId: string,
    toCountryCode: string,
    toPartyId: string,
    authorization: string,
    xRequestId: string,
    xCorrelationId: string,
    version: VersionNumber,
    sessionId: string,
    session: Session
  ) {
    return new PutSessionParams(
      fromCountryCode,
      fromPartyId,
      toCountryCode,
      toPartyId,
      authorization,
      xRequestId,
      xCorrelationId,
      version,
      sessionId,
      session,
    );
  }
}
