import { v4 as uuidv4 } from 'uuid';
import {
  AlreadyRegisteredException,
  BusinessDetails,
  ClientCredentialsRole,
  ClientInformation,
  ClientInformationRepository,
  ClientVersion,
  CredentialsDTO,
  CredentialsResponse,
  Endpoint,
  fromCredentialsRoleDTO,
  Image,
  ImageCategory,
  ImageType,
  InterfaceRole,
  ModuleId,
  NotRegisteredException,
  OcpiLogger,
  OcpiNamespace,
  OcpiResponseStatusCode,
  OcpiSequelizeInstance,
  Role,
  VersionNumber,
  VersionRepository,
  VersionsClientApi,
} from '@citrineos/ocpi-base';
import { Service } from 'typedi';
import { InternalServerError, NotFoundError } from 'routing-controllers';
import { CredentialsClientApi } from '@citrineos/ocpi-base/dist/trigger/CredentialsClientApi';
import { buildPostCredentialsParams } from '@citrineos/ocpi-base/dist/trigger/param/credentials/post.credentials.params';
import { CredentialsRoleDTO } from '@citrineos/ocpi-base/dist/model/DTO/CredentialsRoleDTO';
import { BusinessDetailsDTO } from '@citrineos/ocpi-base/dist/model/DTO/BusinessDetailsDTO';
import { ImageDTO } from '@citrineos/ocpi-base/dist/model/DTO/ImageDTO';
import { CpoTenant } from '@citrineos/ocpi-base/dist/model/CpoTenant';
import { ServerVersion } from '@citrineos/ocpi-base/dist/model/ServerVersion';
import { VersionEndpoint } from '@citrineos/ocpi-base/dist/model/VersionEndpoint';
import { ServerCredentialsRole } from '@citrineos/ocpi-base/dist/model/ServerCredentialsRole';

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

const CpoCredentialsRole = CredentialsRoleDTO.build(
  Role.CPO,
  'COS', // todo is this okay?
  'US',
  BusinessDetailsDTO.build(
    'CitrineOS',
    'https://citrineos.github.io/',
    ImageDTO.build(
      'https://citrineos.github.io/assets/images/231002_Citrine_OS_Logo_CitrineOS_Logo_negative.svg',
      'CitrineOS Logo',
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
  ) {}

  async getClientInformation(token: string): Promise<ClientInformation> {
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

  async postCredentials(
    token: string,
    credentials: CredentialsDTO,
    version: VersionNumber,
  ): Promise<ClientInformation> {
    const clientInformation = await this.getClientInformation(token);
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
    const clientInformation = await this.getClientInformation(token);
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
    const serverVersionUrl = serverVersion.url;

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

    const clientCredentialsUrl = clientVersion.endpoints.find(
      (endpoint) =>
        endpoint.identifier === ModuleId.Credentials &&
        endpoint.role === InterfaceRole.RECEIVER,
    );

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
    await clientCpoTenant.save();
    return clientInformation;
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
      !!postCredentialsResponse.data
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
}
