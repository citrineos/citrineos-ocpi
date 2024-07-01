import { v4 as uuidv4 } from 'uuid';
import { Service } from 'typedi';
import { InternalServerError, NotFoundError } from 'routing-controllers';
import {
  ClientCredentialsRole,
  ClientCredentialsRoleProps,
  fromCredentialsRoleDTO,
} from '../model/ClientCredentialsRole';
import {
  ClientInformation,
  ClientInformationProps,
} from '../model/ClientInformation';
import { ClientInformationRepository } from '../repository/ClientInformationRepository';
import { ClientVersion } from '../model/ClientVersion';
import { CredentialsDTO } from '../model/DTO/CredentialsDTO';
import { Endpoint } from '../model/Endpoint';
import { OcpiLogger } from '../util/logger';
import { OcpiNamespace } from '../util/ocpi.namespace';
import { OcpiSequelizeInstance } from '../util/sequelize';
import { VersionNumber } from '../model/VersionNumber';
import { VersionsClientApi } from '../trigger/VersionsClientApi';
import { AlreadyRegisteredException } from '../exception/AlreadyRegisteredException';
import { NotRegisteredException } from '../exception/NotRegisteredException';
import { BusinessDetails } from '../model/BusinessDetails';
import { Image } from '../model/Image';
import { ServerCredentialsRoleRepository } from '../repository/ServerCredentialsRoleRepository';
import { CpoTenant, CpoTenantProps } from '../model/CpoTenant';
import {
  ServerCredentialsRole,
  ServerCredentialsRoleProps,
} from '../model/ServerCredentialsRole';
import { ClientCredentialsRoleRepository } from '../repository/ClientCredentialsRoleRepository';

const clientInformationInclude = [
  {
    model: ClientCredentialsRole,
    include: [
      {
        model: BusinessDetails,
        include: [Image],
      },
    ],
  },
  {
    model: ClientVersion,
    include: [Endpoint],
  },
];

@Service()
export class CredentialsService {
  constructor(
    readonly ocpiSequelizeInstance: OcpiSequelizeInstance,
    readonly logger: OcpiLogger,
    readonly clientInformationRepository: ClientInformationRepository,
    readonly versionsClientApi: VersionsClientApi,
    readonly serverCredentialsRoleRepository: ServerCredentialsRoleRepository,
    readonly clientCredentialsRoleRepository: ClientCredentialsRoleRepository,
  ) {
    this.getServerCredentialsRoleByCountryCodeAndPartyId('US', 'CPO').then();
  }

  async getClientCredentialsRoleByCountryCodeAndPartyId(
    countryCode: string,
    partyId: string,
  ): Promise<ClientCredentialsRole> {
    const clientCredentialsRole =
      await this.clientCredentialsRoleRepository.readOnlyOneByQuery(
        {
          where: {
            [ClientCredentialsRoleProps.partyId]: partyId,
            [ClientCredentialsRoleProps.countryCode]: countryCode,
          },
        },
        OcpiNamespace.Credentials,
      );
    if (!clientCredentialsRole) {
      const msg =
        'Client credentials role not found for country code and party id';
      this.logger.debug(msg, countryCode, partyId);
      throw new NotFoundError(msg);
    }
    return clientCredentialsRole;
  }

  async getServerCredentialsRoleByCountryCodeAndPartyId(
    countryCode: string,
    partyId: string,
  ): Promise<ServerCredentialsRole> {
    const serverCredentialsRole =
      await this.serverCredentialsRoleRepository.readOnlyOneByQuery(
        {
          where: {
            [ServerCredentialsRoleProps.partyId]: partyId,
            [ServerCredentialsRoleProps.countryCode]: countryCode,
          },
        },
        OcpiNamespace.Credentials,
      );
    if (!serverCredentialsRole) {
      const msg =
        'Server credentials role not found for country code and party id';
      this.logger.debug(msg, countryCode, partyId);
      throw new NotFoundError('Server credentials not found');
    }
    return serverCredentialsRole;
  }

  async getCpoTenantByServerCountryCodeAndPartyId(
    countryCode: string,
    partyId: string,
  ): Promise<CpoTenant> {
    const serverCredentialsRole =
      await this.getServerCredentialsRoleByCountryCodeAndPartyId(
        countryCode,
        partyId,
      );
    const cpoTenant: CpoTenant | null = await serverCredentialsRole.$get(
      ServerCredentialsRoleProps.cpoTenant,
    );
    if (!cpoTenant) {
      const msg = 'CpoTenant not found for server country code and party id';
      this.logger.debug(msg, countryCode, partyId);
      throw new NotFoundError(msg);
    }
    return cpoTenant;
  }

  async getCpoTenantByClientCountryCodeAndPartyId(
    countryCode: string,
    partyId: string,
  ): Promise<CpoTenant> {
    const clientInformation: ClientInformation =
      await this.getClientInformationByClientCountryCodeAndPartyId(
        countryCode,
        partyId,
      );
    const cpoTenant: CpoTenant | null = await clientInformation.$get(
      ClientInformationProps.cpoTenant,
    );
    if (!cpoTenant) {
      const msg = 'CpoTenant not found for client country code and party id';
      this.logger.debug(msg, countryCode, partyId);
      throw new NotFoundError(msg);
    }
    return cpoTenant;
  }

  async getClientInformationByServerCountryCodeAndPartyId(
    countryCode: string,
    partyId: string,
  ): Promise<ClientInformation[]> {
    const cpoTenant = await this.getCpoTenantByServerCountryCodeAndPartyId(
      countryCode,
      partyId,
    );
    const clientInformation: ClientInformation[] | null = await cpoTenant.$get(
      CpoTenantProps.clientInformation,
    );
    if (!clientInformation || clientInformation.length === 0) {
      const msg =
        'Client information not found for server country code and party id';
      this.logger.debug(msg, countryCode, partyId);
      throw new NotFoundError(msg);
    }
    return clientInformation;
  }

  async getClientInformationByClientCountryCodeAndPartyId(
    countryCode: string,
    partyId: string,
  ): Promise<ClientInformation> {
    const clientCredentialsRole =
      await this.getClientCredentialsRoleByCountryCodeAndPartyId(
        countryCode,
        partyId,
      );
    const clientInformation: ClientInformation | null =
      await clientCredentialsRole.$get(
        ClientCredentialsRoleProps.clientInformation,
      );
    if (!clientInformation) {
      const msg =
        'Client information not found for client country code and party id';
      this.logger.debug(msg, countryCode, partyId);
      throw new NotFoundError(msg);
    }
    return clientInformation;
  }

  async getClientInformationByServerToken(
    token: string,
  ): Promise<ClientInformation> {
    const clientInformationResponse =
      await this.clientInformationRepository.readOnlyOneByQuery(
        {
          where: {
            serverToken: token,
          },
          include: clientInformationInclude,
        },
        OcpiNamespace.Credentials,
      );
    if (!clientInformationResponse) {
      this.logger.debug('Client information not found for token', token);
      throw new NotFoundError('Credentials not found');
    }
    return clientInformationResponse;
  }

  async getClientInformationByClientToken(
    token: string,
  ): Promise<ClientInformation> {
    const clientInformationResponse =
      await this.clientInformationRepository.readOnlyOneByQuery(
        {
          where: {
            clientToken: token,
          },
          include: clientInformationInclude,
        },
        OcpiNamespace.Credentials,
      );
    if (!clientInformationResponse) {
      this.logger.debug('Client information not found for token', token);
      throw new NotFoundError('Credentials not found');
    }
    return clientInformationResponse;
  }

  async postCredentials(
    token: string,
    credentials: CredentialsDTO,
    version: VersionNumber,
  ): Promise<ClientInformation> {
    const clientInformation =
      await this.getClientInformationByServerToken(token);
    await this.getClientInformationByServerToken(token);
    if (clientInformation.registered) {
      throw new AlreadyRegisteredException();
    }
    const freshVersionDetails = await this.getClientVersionDetails(
      clientInformation,
      version,
      credentials,
    );
    const transaction =
      await this.ocpiSequelizeInstance.sequelize.transaction();

    try {
      const oldMatchingVersionDetails =
        clientInformation.clientVersionDetails.find(
          (versionDetails: ClientVersion) => versionDetails.version === version,
        );
      if (oldMatchingVersionDetails) {
        await oldMatchingVersionDetails.destroy();
      }
      await freshVersionDetails.save();
      clientInformation.setDataValue('clientVersionDetails', [
        ...clientInformation.clientVersionDetails.filter(
          (role) => role.version !== version,
        ),
        freshVersionDetails,
      ]);

      const newToken = uuidv4();
      clientInformation.clientToken = credentials.token;
      clientInformation.serverToken = newToken;
      clientInformation.registered = true;
      const newClientCredentialsRoles = credentials.roles.map((role) =>
        fromCredentialsRoleDTO(role),
      );

      await this.updateClientCredentialRoles(
        clientInformation,
        newClientCredentialsRoles,
      );
      await clientInformation.save();
      await transaction.commit();
      return clientInformation;
    } catch (error) {
      this.logger.error('Error while posting credentials', error);
      await transaction.rollback();
      throw error;
    }
  }

  async putCredentials(
    token: string,
    credentials: CredentialsDTO,
  ): Promise<ClientInformation> {
    const clientInformation =
      await this.getClientInformationByServerToken(token);
    if (!clientInformation.registered) {
      throw new NotRegisteredException();
    }
    const newToken = uuidv4();
    clientInformation.clientToken = credentials.token;
    clientInformation.serverToken = newToken;
    clientInformation.registered = true;
    const newClientCredentialsRoles = credentials.roles.map((role) =>
      fromCredentialsRoleDTO(role),
    );
    const transaction =
      await this.ocpiSequelizeInstance.sequelize.transaction();

    try {
      await this.updateClientCredentialRoles(
        clientInformation,
        newClientCredentialsRoles,
      );
      await clientInformation.save();
      await transaction.commit();
    } catch (error) {
      this.logger.error('Failed to update credentials', error);
      await transaction.rollback();
      throw error;
    }
    return clientInformation;
  }

  async deleteCredentials(token: string): Promise<void> {
    try {
      // todo, is it okay to delete ClientInformation?
      await this.clientInformationRepository.deleteAllByQuery(
        {
          where: {
            clientToken: token,
          },
        },
        OcpiNamespace.Credentials,
      );
      return;
    } catch (e: any) {
      throw new InternalServerError(
        `Could not delete credentials, ${e.message}`,
      ); // todo error handling
    }
  }

  private async updateClientCredentialRoles(
    clientInformation: ClientInformation,
    newClientCredentialsRoles: ClientCredentialsRole[],
  ) {
    const clientCredentialsRoles = clientInformation.getDataValue(
      'clientCredentialsRoles',
    );
    for (const role of clientCredentialsRoles) {
      await role.destroy();
    }
    clientInformation.setDataValue(
      'clientCredentialsRoles',
      newClientCredentialsRoles,
    );
    for (const role of clientInformation.getDataValue(
      'clientCredentialsRoles',
    )) {
      role.setDataValue(
        'cpoTenantId',
        clientInformation.getDataValue('cpoTenantId'),
      );
      role.setDataValue(
        'clientInformationId',
        clientInformation.getDataValue('id'),
      );
      await role.save();
    }
  }

  private async getClientVersionDetails(
    clientInformation: ClientInformation,
    versionNumber: VersionNumber,
    credentials: CredentialsDTO,
  ): Promise<ClientVersion> {
    const existingVersionDetails = clientInformation.clientVersionDetails.find(
      (v: ClientVersion) => v.version === versionNumber,
    );
    if (!existingVersionDetails) {
      throw new NotFoundError('Version details not found');
    }
    this.versionsClientApi.baseUrl = existingVersionDetails.url;
    const versions = await this.versionsClientApi.getVersions({
      version: versionNumber,
      authorization: credentials.token,
    });
    if (!versions || !versions.data) {
      throw new NotFoundError('Versions not found');
    }

    const version = versions.data?.find(
      (v: any) => v.version === versionNumber,
    );
    if (!version) {
      throw new NotFoundError('Matching version not found');
    }
    this.versionsClientApi.baseUrl = version.url;
    const versionDetails = await this.versionsClientApi.getVersionDetails({
      authorization: credentials.token,
      version: versionNumber,
    });
    if (!versionDetails) {
      throw new NotFoundError('Matching version details not found');
    }
    const clientVersion = ClientVersion.build(
      {
        identifier: versionNumber,
        url: version.url,
        endpoints: versionDetails.data?.endpoints,
      },
      {
        include: [Endpoint],
      },
    );
    clientVersion.setDataValue('clientInformationId', clientInformation.id);
    return clientVersion;
  }
}
