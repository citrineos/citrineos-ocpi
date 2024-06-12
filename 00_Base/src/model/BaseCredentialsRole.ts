import {BusinessDetails} from './BusinessDetails';
import {Role} from './Role';
import {ClientInformation} from "./client.information";
import {CpoTenant} from "./cpo.tenant";

export interface ICredentialsRole {
  role: Role;
  business_details: BusinessDetails;
  cpoTenantId: number;
  cpoTenant: CpoTenant;
  clientInformationId?: number;
  clientInformation?: ClientInformation;
}

export class BaseCredentialsRole implements ICredentialsRole {
  role!: Role;
  business_details!: BusinessDetails;
  cpoTenantId!: number;
  cpoTenant!: CpoTenant;
  clientInformationId!: number;
  clientInformation!: ClientInformation;
}
