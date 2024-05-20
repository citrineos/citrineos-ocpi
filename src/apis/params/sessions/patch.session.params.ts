import {OcpiParams} from "../../util/ocpi.params";

export interface PatchSessionParams extends OcpiParams {
  countryCode: string;
  partyId: string;
  sessionId: string;
  requestBody: { [key: string]: object };
}
