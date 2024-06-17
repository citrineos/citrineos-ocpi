import { HasMany, Model, Table } from 'sequelize-typescript';
import { ClientInformation } from './ClientInformation';
import { ServerCredentialsRole } from './ServerCredentialsRole';
import { Exclude } from 'class-transformer';
import { ON_DELETE_CASCADE } from '../util/sequelize';

@Table
export class CpoTenant extends Model {
  @Exclude()
  @HasMany(() => ServerCredentialsRole, {
    onDelete: ON_DELETE_CASCADE,
  })
  serverCredentialsRoles!: ServerCredentialsRole[];

  @Exclude()
  @HasMany(() => ClientInformation, {
    onDelete: ON_DELETE_CASCADE,
  })
  clientInformation!: ClientInformation[];

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
