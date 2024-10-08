import { BusinessDetails } from './BusinessDetails';
import { Role } from './Role';
import { ClientInformation } from './ClientInformation';
import { CpoTenant } from './CpoTenant';

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
