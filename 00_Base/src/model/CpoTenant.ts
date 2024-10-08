import { HasMany, Model, Table } from '@citrineos/data';
import { ClientInformation } from './ClientInformation';
import { ServerCredentialsRole } from './ServerCredentialsRole';
import { Exclude } from 'class-transformer';
import { ON_DELETE_CASCADE } from '../util/OcpiSequelizeInstance';

export enum CpoTenantProps {
  serverCredentialsRoles = 'serverCredentialsRoles',
  clientInformation = 'clientInformation',
}

@Table
export class CpoTenant extends Model {
  @Exclude()
  @HasMany(() => ServerCredentialsRole, {
    onDelete: ON_DELETE_CASCADE,
  })
  [CpoTenantProps.serverCredentialsRoles]!: ServerCredentialsRole[];

  @Exclude()
  @HasMany(() => ClientInformation, {
    onDelete: ON_DELETE_CASCADE,
  })
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
