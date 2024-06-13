import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  HasMany,
  Model,
  Table,
} from 'sequelize-typescript';
import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';
import {
  ClientCredentialsRole,
  toCredentialsRoleDTO,
} from './client.credentials.role';
import { CredentialsDTO } from './DTO/CredentialsDTO';
import { CpoTenant } from './cpo.tenant';
import { Exclude } from 'class-transformer';
import { ClientVersion } from './client.version';
import { ServerVersion } from './server.version';
import { ON_DELETE_CASCADE } from '../util/sequelize';
import { ModuleId } from './ModuleId';
import { Endpoint } from './Endpoint';

@Table
export class ClientInformation extends Model {
  @Column({
    type: DataType.STRING,
    unique: true,
  })
  @IsString()
  @IsNotEmpty()
  clientToken!: string;

  @Column({
    type: DataType.STRING,
    unique: true,
  })
  @IsString()
  @IsNotEmpty()
  serverToken!: string;

  @Column(DataType.BOOLEAN)
  @IsBoolean()
  @IsNotEmpty()
  registered!: boolean;

  @Exclude()
  @HasMany(() => ClientCredentialsRole, {
    onDelete: ON_DELETE_CASCADE,
  })
  clientCredentialsRoles!: ClientCredentialsRole[];

  @Exclude()
  @HasMany(() => ClientVersion, {
    onDelete: ON_DELETE_CASCADE,
  })
  clientVersionDetails!: ClientVersion[];

  @Exclude()
  @HasMany(() => ServerVersion, {
    onDelete: ON_DELETE_CASCADE,
  })
  serverVersionDetails!: ServerVersion[];

  @Exclude()
  @ForeignKey(() => CpoTenant)
  @Column(DataType.INTEGER)
  cpoTenantId!: number;

  @Exclude()
  @BelongsTo(() => CpoTenant)
  cpoTenant!: CpoTenant;

  static buildClientInformation(
    clientToken: string,
    serverToken: string,
    registered: boolean,
    clientCredentialsRoles: ClientCredentialsRole[],
    clientVersionDetails: ClientVersion[],
    serverVersionDetails: ServerVersion[],
  ): ClientInformation {
    const clientInformation = new ClientInformation();
    clientInformation.clientToken = clientToken;
    clientInformation.serverToken = serverToken;
    clientInformation.registered = registered;
    clientInformation.clientCredentialsRoles = clientCredentialsRoles;
    clientInformation.clientVersionDetails = clientVersionDetails;
    clientInformation.serverVersionDetails = serverVersionDetails;
    return clientInformation;
  }
}

export const getClientVersionDetailsByModuleId = (
  clientInformation: ClientInformation,
  moduleId: ModuleId,
): Endpoint | undefined =>
  clientInformation.clientVersionDetails[0].endpoints.find(
    (endpoint) => endpoint.identifier === moduleId,
  );

export const toCredentialsDTO = (
  clientInformation: ClientInformation,
): CredentialsDTO => {
  const credentials = new CredentialsDTO();
  credentials.token = clientInformation.serverToken;
  const credentialsEndpoint = getClientVersionDetailsByModuleId(
    clientInformation,
    ModuleId.Credentials,
  );
  if (credentialsEndpoint && credentialsEndpoint.url) {
    credentials.url = credentialsEndpoint.url;
  }
  credentials.roles = clientInformation.clientCredentialsRoles.map(
    (role: ClientCredentialsRole) => toCredentialsRoleDTO(role),
  );
  return credentials;
};
