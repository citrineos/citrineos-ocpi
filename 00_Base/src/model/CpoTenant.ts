import { ClientInformation } from './ClientInformation';
import { ServerCredentialsRole } from './ServerCredentialsRole';
import { Exclude } from 'class-transformer';

export enum CpoTenantProps {
  serverCredentialsRoles = 'serverCredentialsRoles',
  clientInformation = 'clientInformation',
}

export class CpoTenant {
  @Exclude()
  [CpoTenantProps.serverCredentialsRoles]!: ServerCredentialsRole[];

  @Exclude()
  [CpoTenantProps.clientInformation]!: ClientInformation[];

  static buildCpoTenant(
    serverCredentialsRoles: ServerCredentialsRole[],
    clientInformation: ClientInformation[],
  ) {
    const cpoTenant = new CpoTenant();
    cpoTenant.serverCredentialsRoles = serverCredentialsRoles;
    cpoTenant.clientInformation = clientInformation;
    return cpoTenant;
  }
}
