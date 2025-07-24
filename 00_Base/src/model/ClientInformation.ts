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
import { ModuleId } from './ModuleId';
import { Endpoint } from './Endpoint';
import { VersionNumber } from './VersionNumber';

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

export class ClientInformation {
  @IsString()
  @IsNotEmpty()
  [ClientInformationProps.clientToken]!: string;

  @IsString()
  @IsNotEmpty()
  [ClientInformationProps.serverToken]!: string;

  @IsBoolean()
  @IsNotEmpty()
  [ClientInformationProps.registered]!: boolean;

  @Exclude()
  [ClientInformationProps.clientCredentialsRoles]!: ClientCredentialsRole[];

  @Exclude()
  [ClientInformationProps.clientVersionDetails]!: ClientVersion[];

  @Exclude()
  [ClientInformationProps.serverVersionDetails]!: ServerVersion[];

  @Exclude()
  [ClientInformationProps.cpoTenantId]!: number;

  @Exclude()
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

  public getReceiversOf(
    module: ModuleId,
  ): { version: VersionNumber; endpoints: Endpoint[] }[] {
    return this[ClientInformationProps.clientVersionDetails].flatMap(
      (clientVersion) => {
        const endpoints = clientVersion.endpoints.filter(
          (endpoint) => endpoint.identifier === module,
        );
        return endpoints.length > 0
          ? [{ version: clientVersion.version, endpoints }]
          : [];
      },
    );
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
