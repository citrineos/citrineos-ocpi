import {OcpiParams} from "../../util/ocpi.params";
import {Session} from "../../../model/Session";

export interface PutSessionParams extends OcpiParams {
  countryCode: string;
  partyId: string;
  sessionId: string;
  session: Session;
}
