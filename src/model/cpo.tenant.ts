import {HasMany, Model, Table} from "sequelize-typescript";
import {ClientInformation} from "./client.information";
import {ServerCredentialsRole} from "./server.credentials.role";
import {Exclude} from "class-transformer";

@Table
export class CpoTenant extends Model {

  @Exclude()
  @HasMany(() => ServerCredentialsRole)
  serverCredentialsRoles!: ServerCredentialsRole[];

  @Exclude()
  @HasMany(() => ClientInformation)
  clientInformation!: ClientInformation[];

  static buildCpoTenant(
    serverCredentialsRoles: ServerCredentialsRole[],
    clientInformation: ClientInformation[]
  ) {
    const cpoTenant = new CpoTenant();
    cpoTenant.serverCredentialsRoles = serverCredentialsRoles;
    cpoTenant.clientInformation = clientInformation;
    return cpoTenant;
  }
}
