import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  HasMany,
  Model,
  Table,
} from '@citrineos/data';
import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';
import {
  ClientCredentialsRole,
  toCredentialsRoleDTO,
} from './ClientCredentialsRole';
import { CredentialsDTO } from './DTO/CredentialsDTO';
import { CpoTenant } from './CpoTenant';
import { Exclude } from 'class-transformer';
import { ClientVersion } from './ClientVersion';
import { ServerVersion } from './ServerVersion';
import { ON_DELETE_CASCADE } from '../util/sequelize';
import { ModuleId } from './ModuleId';
import { Endpoint } from './Endpoint';

export enum ClientInformationProps {
  clientToken = 'clientToken',
  serverToken = 'serverToken',
  registered = 'registered',
  clientCredentialsRoles = 'clientCredentialsRoles',
  clientVersionDetails = 'clientVersionDetails',
  serverVersionDetails = 'serverVersionDetails',
  cpoTenantId = 'cpoTenantId',
  cpoTenant = 'cpoTenant',
}

@Table
export class ClientInformation extends Model {
  @Column({
    type: DataType.STRING,
    unique: true,
  })
  @IsString()
  @IsNotEmpty()
  [ClientInformationProps.clientToken]!: string;

  @Column({
    type: DataType.STRING,
    unique: true,
  })
  @IsString()
  @IsNotEmpty()
  [ClientInformationProps.serverToken]!: string;

  @Column(DataType.BOOLEAN)
  @IsBoolean()
  @IsNotEmpty()
  [ClientInformationProps.registered]!: boolean;

  @Exclude()
  @HasMany(() => ClientCredentialsRole, {
    onDelete: ON_DELETE_CASCADE,
  })
  [ClientInformationProps.clientCredentialsRoles]!: ClientCredentialsRole[];

  @Exclude()
  @HasMany(() => ClientVersion, {
    onDelete: ON_DELETE_CASCADE,
  })
  [ClientInformationProps.clientVersionDetails]!: ClientVersion[];

  @Exclude()
  @HasMany(() => ServerVersion, {
    onDelete: ON_DELETE_CASCADE,
  })
  [ClientInformationProps.serverVersionDetails]!: ServerVersion[];

  @Exclude()
  @ForeignKey(() => CpoTenant)
  @Column(DataType.INTEGER)
  [ClientInformationProps.cpoTenantId]!: number;

  @Exclude()
  @BelongsTo(() => CpoTenant)
  [ClientInformationProps.cpoTenant]!: CpoTenant;

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
