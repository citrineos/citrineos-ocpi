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
import { CredentialsRoleDTO } from '../model/DTO/CredentialsRoleDTO';
import { Role } from '../model/Role';
import { BusinessDetailsDTO } from '../model/DTO/BusinessDetailsDTO';
import { ImageDTO } from '../model/DTO/ImageDTO';
import { ImageCategory } from '../model/ImageCategory';
import { ImageType } from '../model/ImageType';
import { CredentialsClientApi } from '../trigger/CredentialsClientApi';
import { VersionRepository } from '../repository/VersionRepository';
import { VersionEndpoint } from '../model/VersionEndpoint';
import { CpoTenant } from '../model/CpoTenant';
import { ServerCredentialsRole } from '../model/ServerCredentialsRole';
import { ServerVersion } from '../model/ServerVersion';
import { ModuleId } from '../model/ModuleId';
import { InterfaceRole } from '../model/InterfaceRole';
import { CredentialsResponse } from '../model/CredentialsResponse';
import { buildPostCredentialsParams } from '../trigger/param/credentials/post.credentials.params';
import { OcpiResponseStatusCode } from '../model/ocpi.response';
import { ServerCredentialsRoleRepository } from '../repository/ServerCredentialsRoleRepository';
import { ClientCredentialsRoleRepository } from '../repository/ClientCredentialsRoleRepository';
import { CpoTenantRepository } from '../repository/CpoTenantRepository';

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

// TODO: temporarily creating CPO credentials, but for multi tenant support, the server credentials
// should only be made via the admin endpoints and not be hardcoded
const CpoCredentialsRole = CredentialsRoleDTO.build(
  Role.CPO,
  'COS', // todo is this okay?
  'US',
  BusinessDetailsDTO.build(
    'CitrineOS',
    'https://citrineos.github.io/',
    ImageDTO.build(
      'https://citrineos.github.io/assets/images/231002_Citrine_OS_Logo_CitrineOS_Logo_negative.svg',
      'https://citrineos.github.io/assets/images/231002_Citrine_OS_Logo_CitrineOS_Logo_negative.svg',
      ImageCategory.OTHER,
      ImageType.png,
      100,
      100,
    ),
  ),
);

@Service()
export class CredentialsService {
  constructor(
    readonly ocpiSequelizeInstance: OcpiSequelizeInstance,
    readonly logger: OcpiLogger,
    readonly clientInformationRepository: ClientInformationRepository,
    readonly versionsClientApi: VersionsClientApi,
    readonly credentialsClientApi: CredentialsClientApi,
    readonly versionRepository: VersionRepository,
    readonly serverCredentialsRoleRepository: ServerCredentialsRoleRepository,
    readonly clientCredentialsRoleRepository: ClientCredentialsRoleRepository,
    readonly cpoTenantRepository: CpoTenantRepository,
  ) {}

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
    return this.serverCredentialsRoleRepository.getServerCredentialsRoleByCountryCodeAndPartyId(
      countryCode,
      partyId,
    );
  }

  async getCpoTenantByServerCountryCodeAndPartyId(
    countryCode: string,
    partyId: string,
  ): Promise<CpoTenant> {
    return this.clientInformationRepository.getCpoTenantByServerCountryCodeAndPartyId(
      countryCode,
      partyId,
    );
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
    return this.clientInformationRepository.getClientInformationByServerCountryCodeAndPartyId(
      countryCode,
      partyId,
    );
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

  // TODO: add server details for multi tenant support
  async registerCredentialsTokenA(
    versionNumber: VersionNumber,
    credentials: CredentialsDTO,
  ): Promise<ClientInformation> {
    const credentialsTokenA = credentials.token;

    const serverVersionResponse = await this.versionRepository.readAllByQuery({
      where: {
        version: versionNumber,
      },
      include: [VersionEndpoint],
    });
    if (!serverVersionResponse || !serverVersionResponse[0]) {
      throw new NotFoundError('Version not found');
    }
    const serverVersion = serverVersionResponse[0];
    // TODO, should version url should be in DB?
    const serverVersionUrl =
      'https://plugfest-dallas.demo.citrineos.app:445/ocpi/versions';

    const clientVersion = await this.getVersionDetails(
      versionNumber,
      credentials.url,
      credentialsTokenA,
    );
    if (!clientVersion) {
      throw new NotFoundError(
        'Did not successfully retrieve client version details',
      );
    }

    const credentialsTokenB = uuidv4();

    const clientCpoTenant = CpoTenant.build(
      {
        serverCredentialsRoles: [CpoCredentialsRole],
        clientInformation: [
          {
            registered: true,
            clientToken: credentialsTokenA,
            serverToken: credentialsTokenB,
            clientCredentialsRoles: credentials.roles,
            clientVersionDetails: [
              {
                version: clientVersion.version,
                url: clientVersion.url,
                endpoints: clientVersion.endpoints.map((endpoint) => ({
                  identifier: endpoint.identifier,
                  role: endpoint.role,
                  url: endpoint.url,
                })),
              },
            ],
            serverVersionDetails: [
              {
                version: serverVersion.version,
                url: serverVersion.url,
                endpoints: serverVersion.endpoints.map((endpoint) => ({
                  identifier: endpoint.identifier,
                  role: endpoint.role,
                  url: endpoint.url,
                })),
              },
            ],
          },
        ],
      },
      {
        include: [
          {
            model: ServerCredentialsRole,
            include: [
              {
                model: BusinessDetails,
                include: [Image],
              },
            ],
          },
          {
            model: ClientInformation,
            include: [
              {
                model: ClientVersion,
                include: [Endpoint],
              },
              {
                model: ServerVersion,
                include: [Endpoint],
              },
              {
                model: ClientCredentialsRole,
                include: [
                  {
                    model: BusinessDetails,
                    include: [Image],
                  },
                ],
              },
            ],
          },
        ],
      },
    );

    const clientInformation = clientCpoTenant.clientInformation[0];

    // await clientInformation.save(); // todo
    await clientCpoTenant.save();

    const clientCredentialsEndpoint = clientVersion.endpoints.find(
      (endpoint) =>
        endpoint.identifier === ModuleId.Credentials &&
        endpoint.role === InterfaceRole.RECEIVER,
    );

    if (!clientCredentialsEndpoint || !clientCredentialsEndpoint.url) {
      throw new NotFoundError(
        'Did not successfully retrieve client credentials from version details',
      );
    }

    const clientCredentialsUrl = clientCredentialsEndpoint.url;
    const updatedClientInformation =
      await this.performPostAndReturnSavedClientCredentials(
        clientInformation,
        clientCredentialsUrl,
        versionNumber,
        credentialsTokenA,
        credentialsTokenB,
        serverVersionUrl,
      );
    console.debug('updatedClientInformation', updatedClientInformation);
    return updatedClientInformation;
  }

  async deleteTenant(tenantId: string): Promise<void> {
    const cpoTenant = await this.cpoTenantRepository.readOnlyOneByQuery({
      where: {
        id: tenantId,
      },
    });
    if (!cpoTenant) {
      throw new NotFoundError('CpoTenant not found');
    }
    try {
      await this.clientInformationRepository.deleteAllByQuery({
        where: {
          [ClientInformationProps.cpoTenantId]: cpoTenant.id,
        },
      });
      await this.cpoTenantRepository.deleteAllByQuery(
        {
          where: {
            id: tenantId,
          },
        },
        OcpiNamespace.Credentials,
      );
      return;
    } catch (e: any) {
      throw new InternalServerError(`Could not delete tenant, ${e.message}`);
    }
  }

  private async getPostCredentialsResponse(
    clientCredentialsUrl: string,
    versionNumber: VersionNumber,
    credentialsTokenA: string,
    credentialsTokenB: string,
    serverVersionUrl: string,
  ): Promise<CredentialsResponse> {
    this.credentialsClientApi.baseUrl = clientCredentialsUrl;
    const postCredentialsResponse =
      await this.credentialsClientApi.postCredentials(
        buildPostCredentialsParams(
          versionNumber,
          credentialsTokenA,
          this.buildCredentialsDTO(credentialsTokenB, serverVersionUrl),
        ),
      );
    if (
      !postCredentialsResponse ||
      postCredentialsResponse.status_code !==
        OcpiResponseStatusCode.GenericSuccessCode ||
      !postCredentialsResponse.data
    ) {
      throw new InternalServerError(
        'Could not successfully post credentials to client',
      );
    }
    return postCredentialsResponse;
  }

  private buildCredentialsDTO(
    credentialsTokenB: string,
    serverVersionUrl: string,
  ): CredentialsDTO {
    return CredentialsDTO.build(credentialsTokenB, serverVersionUrl, [
      CpoCredentialsRole,
    ]);
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
    const clientVersion = await this.getVersionDetails(
      versionNumber,
      existingVersionDetails.url,
      credentials.token,
    );
    clientVersion.setDataValue('clientInformationId', clientInformation.id);
    return clientVersion;
  }

  private async getVersionDetails(
    versionNumber: VersionNumber,
    url: string,
    token: string,
  ): Promise<ClientVersion> {
    this.versionsClientApi.baseUrl = url;

    const versions = await this.versionsClientApi.getVersions({
      version: versionNumber,
      authorization: token,
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
      authorization: token,
      version: versionNumber,
    });
    if (!versionDetails) {
      throw new NotFoundError('Matching version details not found');
    }
    return ClientVersion.build(
      {
        version: versionNumber,
        url: version.url,
        endpoints: versionDetails.data?.endpoints,
      },
      {
        include: [Endpoint],
      },
    );
  }

  private async performPostAndReturnSavedClientCredentials(
    clientInformation: ClientInformation,
    clientCredentialsUrl: string,
    versionNumber: VersionNumber,
    credentialsTokenA: string,
    credentialsTokenB: string,
    serverVersionUrl: string,
  ): Promise<ClientInformation> {
    const postCredentialsResponse = await this.getPostCredentialsResponse(
      clientCredentialsUrl,
      versionNumber,
      credentialsTokenA,
      credentialsTokenB,
      serverVersionUrl,
    );
    const postCredentials: CredentialsDTO = postCredentialsResponse.data;
    const credentialsTokenC = postCredentials.token;
    clientInformation.clientToken = credentialsTokenC;

    const clientCredentialsRoles = postCredentials.roles;
    // remove old roles that were passed in via endpoint // todo maybe dont set roles in endpoint then?
    for (const clientCredentialsRole of clientInformation.clientCredentialsRoles) {
      // todo can this be done in one query??
      await clientInformation.$remove(
        ClientInformationProps.clientCredentialsRoles,
        clientCredentialsRole,
      );
      await clientCredentialsRole.destroy();
    }
    // add new
    const newClientCredentialsRoles = clientCredentialsRoles.map(
      (credentialsRoleDTO) =>
        ClientCredentialsRole.create(
          {
            ...(credentialsRoleDTO as Partial<ClientCredentialsRole>),
            [ClientCredentialsRoleProps.clientInformationId]:
              clientInformation.id,
          },
          {
            include: [
              {
                model: BusinessDetails,
                include: [Image],
              },
            ],
          },
        ),
    );
    clientInformation.setDataValue(
      ClientInformationProps.clientCredentialsRoles,
      newClientCredentialsRoles,
    );
    return await clientInformation.save();
  }
}
