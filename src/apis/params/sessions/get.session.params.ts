import {OcpiParams} from "../../util/ocpi.params";

export interface GetSessionParams extends OcpiParams {
  countryCode: string;
  partyId: string;
  sessionId: string;
}
