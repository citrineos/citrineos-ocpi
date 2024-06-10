import {VersionNumber} from './VersionNumber';
import {Endpoint} from './Endpoint';
import {ClientInformation} from "./client.information";

export interface Version {
  id?: number;
  version: VersionNumber;
  url: string;
  endpoints: Endpoint[];
  clientInformationId: number;
  clientInformation: ClientInformation;
}
