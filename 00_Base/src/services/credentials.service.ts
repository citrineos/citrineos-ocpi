import { v4 as uuidv4 } from 'uuid';
import { Service } from 'typedi';
import {
  BadRequestError,
  InternalServerError,
  NotFoundError,
} from 'routing-controllers';
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
import {
  ServerCredentialsRole,
  ServerCredentialsRoleProps,
} from '../model/ServerCredentialsRole';
import { ServerVersion } from '../model/ServerVersion';
import { ModuleId } from '../model/ModuleId';
import { InterfaceRole } from '../model/InterfaceRole';
import { CredentialsResponse } from '../model/CredentialsResponse';
import { buildPostCredentialsParams } from '../trigger/param/credentials/post.credentials.params';
import { OcpiResponseStatusCode } from '../model/ocpi.response';
import { ServerCredentialsRoleRepository } from '../repository/ServerCredentialsRoleRepository';
import { ClientCredentialsRoleRepository } from '../repository/ClientCredentialsRoleRepository';
import { UnregisterClientRequestDTO } from '../model/UnregisterClientRequestDTO';
import { AdminCredentialsRequestDTO } from '../model/DTO/AdminCredentialsRequestDTO';
import { validateVersionEndpointByModuleId } from '../util/validators/VersionsValidators';
import { validateRole } from '../util/validators/CredentialsValidators';
import { buildPutCredentialsParams } from '../trigger/param/credentials/put.credentials.params';
import { AdminUpdateCredentialsRequestDTO } from '../model/DTO/AdminUpdateCredentialsRequestDTO';
import { CpoTenantRepository } from '../repository/CpoTenantRepository';
import { UnsuccessfulRequestException } from '../exception/UnsuccessfulRequestException';
import { OcpiParams } from '../trigger/util/ocpi.params';
import { OcpiEmptyResponse } from '../model/ocpi.empty.response';

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

  async getClientTokenByClientCountryCodeAndPartyId(
    countryCode: string,
    partyId: string,
  ): Promise<string> {
    const clientInformation =
      await this.getClientInformationByClientCountryCodeAndPartyId(
        countryCode,
        partyId,
      );
    if (
      !clientInformation ||
      !clientInformation[ClientInformationProps.clientToken]
    ) {
      const msg = `Client information and token not found for provided country code: ${countryCode}  and party id: ${partyId}`;
      this.logger.error(msg);
      throw new NotFoundError();
    }
    return clientInformation[ClientInformationProps.clientToken];
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
    const cpoTenant = await this.cpoTenantRepository.readOnlyOneByQuery(
      {
        where: {},
        include: [
          ServerCredentialsRole,
          {
            model: ClientInformation,
            include: [
              {
                model: ClientVersion,
                include: [Endpoint],
              },
              {
                model: ClientCredentialsRole,
                where: {
                  [ClientCredentialsRoleProps.partyId]: partyId,
                  [ClientCredentialsRoleProps.countryCode]: countryCode,
                },
              },
            ],
          },
        ],
      },
      OcpiNamespace.Credentials,
    );
    if (!cpoTenant) {
      const msg = 'Cpo Tenant not found for client country code and party id';
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

    const clientCredentialsUrl = this.findClientCredentialsUrl(clientVersion);
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

  async deleteTenant(
    tenantId: string,
    versionNumber = VersionNumber.TWO_DOT_TWO_DOT_ONE,
  ): Promise<void> {
    const cpoTenant = await this.cpoTenantRepository.readOnlyOneByQuery({
      where: {
        id: tenantId,
      },
      include: [ServerCredentialsRole],
    });
    if (!cpoTenant) {
      throw new NotFoundError('CpoTenant not found');
    }

    const serverCredentialsRoles = cpoTenant.serverCredentialsRoles;
    const serverCredentialsRole = serverCredentialsRoles[0];

    const transaction =
      await this.ocpiSequelizeInstance.sequelize.transaction();

    try {
      const clientInformations =
        await this.clientInformationRepository.readAllByQuery({
          where: {
            [ClientInformationProps.cpoTenantId]: cpoTenant.id,
          },
          include: [ClientCredentialsRole],
        });
      if (clientInformations && clientInformations.length > 0) {
        for (let clientInformation of clientInformations) {
          const clientCredentialsRoles =
            clientInformation[ClientInformationProps.clientCredentialsRoles];
          for (let clientCredentialsRole of clientCredentialsRoles) {
            await this.unregisterClientInformation(
              clientInformation,
              versionNumber,
              clientCredentialsRole[ClientCredentialsRoleProps.countryCode],
              clientCredentialsRole[ClientCredentialsRoleProps.partyId],
              serverCredentialsRole[ServerCredentialsRoleProps.countryCode],
              serverCredentialsRole[ServerCredentialsRoleProps.partyId],
            );
          }
          await clientInformation.destroy();
        }
      }
      const cpoTenants = await this.cpoTenantRepository.readAllByQuery({
        where: {
          id: tenantId,
        },
      });
      if (cpoTenants && cpoTenants.length > 0) {
        for (let cpoTenant of cpoTenants) {
          await cpoTenant.destroy();
        }
      }
      await transaction.commit();
      return;
    } catch (e: any) {
      await transaction.rollback();
      throw new InternalServerError(`Could not delete tenant, ${e.message}`);
    }
  }

  async unregisterClient(
    request: UnregisterClientRequestDTO,
    versionNumber = VersionNumber.TWO_DOT_TWO_DOT_ONE,
  ): Promise<void> {
    const serverPartyId = request.serverPartyId;
    const serverCountryCode = request.serverCountryCode;
    const clientPartyId = request.clientPartyId;
    const clientCountryCode = request.clientCountryCode;
    const clientInformations =
      await this.getClientInformationByServerCountryCodeAndPartyId(
        serverCountryCode,
        serverPartyId,
      );
    if (!clientInformations) {
      throw new NotFoundError(
        `Client information not found for server party id ${serverPartyId} and server country code ${serverCountryCode}`,
      );
    }
    const clientInformationMatches = this.getClientInformationMatches(
      clientInformations,
      clientCountryCode,
      clientPartyId,
    );
    if (!clientInformationMatches || clientInformationMatches.length === 0) {
      throw new NotFoundError(
        `Client credentials roles not found for client party id ${clientPartyId} and client country code ${clientCountryCode}`,
      );
    }

    for (const clientInformation of clientInformationMatches) {
      await this.unregisterClientInformation(
        clientInformation,
        versionNumber,
        clientCountryCode,
        clientPartyId,
        serverCountryCode,
        serverPartyId,
      );
    }
  }

  private async unregisterClientInformation(
    clientInformation: ClientInformation,
    versionNumber: VersionNumber,
    clientCountryCode: string,
    clientPartyId: string,
    serverCountryCode: string,
    serverPartyId: string,
  ) {
    const clientVersionDetails =
      clientInformation[ClientInformationProps.clientVersionDetails];
    const clientVersion = clientVersionDetails.find(
      (clientVersion) => clientVersion.version === versionNumber,
    );
    if (!clientVersion) {
      throw new NotFoundError(
        `Client version not found for client party id ${clientPartyId} and client country code ${clientCountryCode} and matching version ${versionNumber}`,
      );
    }
    const clientCredentialsUrl = this.findClientCredentialsUrl(clientVersion);
    const authorizationToken =
      clientInformation[ClientInformationProps.clientToken];
    const credentialsRoleMatch = clientInformation[
      ClientInformationProps.clientCredentialsRoles
    ].find((clientInformations) => {
      return (
        clientInformations.country_code === clientCountryCode &&
        clientInformations.party_id === clientPartyId
      );
    });
    const deleteCredentialsResponse = await this.getDeleteCredentialsResponse(
      clientCredentialsUrl,
      versionNumber,
      authorizationToken,
      credentialsRoleMatch![ClientCredentialsRoleProps.countryCode],
      credentialsRoleMatch![ClientCredentialsRoleProps.partyId],
      serverCountryCode,
      serverPartyId,
    );
    if (deleteCredentialsResponse) {
      await credentialsRoleMatch!.destroy();
    }
  }

  private async getDeleteCredentialsResponse(
    url: string,
    versionNumber: VersionNumber,
    authorizationToken: string,
    clientCountryCode: string,
    clientPartyId: string,
    serverCountryCode: string,
    serverPartyId: string,
  ): Promise<OcpiEmptyResponse> {
    try {
      const params = new OcpiParams();
      params.version = versionNumber;
      params.authorization = authorizationToken;
      params.toCountryCode = clientCountryCode;
      params.toPartyId = clientPartyId;
      params.fromCountryCode = serverCountryCode;
      params.fromPartyId = serverPartyId;
      params.xRequestId = uuidv4();
      params.xCorrelationId = uuidv4();
      this.credentialsClientApi.baseUrl = url;
      return await this.credentialsClientApi.deleteCredentials(params);
    } catch (e: any) {
      const msg = `Could not delete credentials. Request to client failed with message: ${e.message}`;
      this.logger.error(msg);
      throw new UnsuccessfulRequestException(msg);
    }
  }

  async generateCredentialsTokenA(
    credentialsRequest: AdminCredentialsRequestDTO,
    versionNumber: VersionNumber,
  ): Promise<CredentialsDTO> {
    // The input roles must be CPO
    const receivedRoles = credentialsRequest.roles;
    validateRole(receivedRoles, Role.CPO);

    // Make sure we stored the necessary version and version endpoints
    // so that MSP can retrieve them later in the registration process
    const storedVersionEndpoints =
      await this.versionRepository.findVersionEndpointsByVersionNumber(
        versionNumber,
      );
    validateVersionEndpointByModuleId(
      storedVersionEndpoints,
      ModuleId.Credentials,
    );

    const storedServerCredentialsRoles: ServerCredentialsRole[] =
      await this.storeServerCredentialsRoles(receivedRoles);

    const credentialsTokenA = uuidv4();
    // clientToken, clientCredentialsRoles and clientVersionDetails
    // are added in the following post credentials requests based on the registration process
    const clientInfo = await ClientInformation.create(
      {
        cpoTenantId: storedServerCredentialsRoles[0].cpoTenantId,
        registered: false,
        serverToken: credentialsTokenA,
        serverVersionDetails: [
          {
            version: versionNumber,
            url: credentialsRequest.url,
            endpoints: storedVersionEndpoints.map((endpoint) => ({
              identifier: endpoint.identifier,
              role: endpoint.role,
              url: endpoint.url,
            })),
          },
        ],
      },
      {
        include: [
          {
            model: ServerVersion,
            include: [Endpoint],
          },
        ],
      },
    );

    const storedServerCredentialsRoleDTOs = storedServerCredentialsRoles.map(
      (storedRole) => ServerCredentialsRole.toCredentialsRoleDTO(storedRole),
    );
    return CredentialsDTO.build(
      clientInfo.serverToken,
      clientInfo.serverVersionDetails[0].url,
      storedServerCredentialsRoleDTOs,
    );
  }

  async regenerateCredentialsToken(
    credentialsRequest: AdminUpdateCredentialsRequestDTO,
    versionNumber: VersionNumber,
  ): Promise<CredentialsDTO> {
    try {
      // 1. validation
      // expected received roles to be CPO
      const receivedRoles = credentialsRequest.roles;
      validateRole(receivedRoles, Role.CPO);
      // expected registered ClientInformation to be found in the database
      const existingClientInformation =
        await this.getRegisteredClientInformation(credentialsRequest);
      // expected clientCredentialsUrl to be found in the database
      const clientVersion =
        await this.getClientVersionByClientInformationAndVersionNumber(
          existingClientInformation,
          versionNumber,
        );
      const clientCredentialsUrl = this.findClientCredentialsUrl(clientVersion);

      // 2. generate new server token and update db data
      const serverCredentialsDTO: CredentialsDTO = CredentialsDTO.build(
        uuidv4(), // new server token
        credentialsRequest.url,
        receivedRoles,
      );
      const storedServerCredentialsRoles: ServerCredentialsRole[] =
        await this.updateServerCredentials(
          existingClientInformation,
          serverCredentialsDTO,
          versionNumber,
          receivedRoles,
        );

      // 3. send putCredentials request to MSP and update db data
      const clientCredentialsDTO = await this.putCredentialsToMSP(
        versionNumber,
        serverCredentialsDTO,
        existingClientInformation.clientToken,
        clientCredentialsUrl,
      );
      await this.updateClientCredentials(
        existingClientInformation,
        clientCredentialsDTO,
        versionNumber,
      );

      // 4. return credentialsDTO result
      const serverCredentialsRoleDTOs = storedServerCredentialsRoles.map(
        (role) => ServerCredentialsRole.toCredentialsRoleDTO(role),
      );
      return CredentialsDTO.build(
        serverCredentialsDTO.token,
        serverCredentialsDTO.url,
        serverCredentialsRoleDTOs,
      );
    } catch (error) {
      this.logger.error('Regenerate credentials token failed, ', error);
      throw new InternalServerError(
        `Regenerate credentials token failed, ${JSON.stringify(error)}`,
      );
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
    const clientVersion = await this.getVersionDetails(
      versionNumber,
      credentials.url,
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
    // TODO: add validation to check expected endpoints based on OCPP 2.2.1, 7.1.6
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

    return await this.updateClientInformationByClientCredentialsDTO(
      clientInformation,
      postCredentials,
    );
  }

  private async getCpoTenantIdForServerRolesForRegistration(
    serverCredentialsRoleDTOs: CredentialsRoleDTO[],
  ): Promise<number | undefined> {
    let cpoTenantId: number | undefined;
    for (const role of serverCredentialsRoleDTOs) {
      try {
        const storedRole =
          await this.serverCredentialsRoleRepository.getServerCredentialsRoleByCountryCodeAndPartyId(
            role.country_code,
            role.party_id,
          );
        if (!cpoTenantId) {
          cpoTenantId = storedRole.cpoTenantId;
        } else if (cpoTenantId !== storedRole.cpoTenantId) {
          throw new BadRequestError(
            `ServerCredentialsRoles belongs to different CPO tenants`,
          );
        }
      } catch (e) {
        if (e instanceof NotFoundError) {
          this.logger.debug(
            `ServerCredentialsRole with country_code ${role.country_code} and party_id ${role.party_id} not found and can be created.`,
          );
        } else {
          throw e;
        }
      }
    }

    return cpoTenantId;
  }

  private async storeServerCredentialsRoles(
    credentialsRoleDTOs: CredentialsRoleDTO[],
  ): Promise<ServerCredentialsRole[]> {
    const storedServerCredentialsRoles: ServerCredentialsRole[] = [];

    const cpoTenantId =
      await this.getCpoTenantIdForServerRolesForRegistration(
        credentialsRoleDTOs,
      );
    if (!cpoTenantId) {
      const cpoTenant = await CpoTenant.create(
        {
          serverCredentialsRoles: credentialsRoleDTOs,
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
          ],
        },
      );
      this.logger.info(`Created CpoTenant: ${JSON.stringify(cpoTenant)}`);
      storedServerCredentialsRoles.push(...cpoTenant.serverCredentialsRoles);
    } else {
      storedServerCredentialsRoles.push(
        ...(await this.serverCredentialsRoleRepository.createOrUpdateServerCredentialsRoles(
          credentialsRoleDTOs,
          cpoTenantId,
        )),
      );
    }

    return storedServerCredentialsRoles;
  }

  private async putCredentialsToMSP(
    versionNumber: VersionNumber,
    credentialsDTO: CredentialsDTO,
    clientToken: string,
    clientCredentialsUrl: string,
  ): Promise<CredentialsDTO> {
    this.credentialsClientApi.baseUrl = clientCredentialsUrl;

    try {
      const putCredentialsResponse =
        await this.credentialsClientApi.putCredentials(
          buildPutCredentialsParams(versionNumber, clientToken, credentialsDTO),
        );
      if (
        !putCredentialsResponse ||
        putCredentialsResponse.status_code !==
          OcpiResponseStatusCode.GenericSuccessCode ||
        !putCredentialsResponse.data
      ) {
        throw new Error(
          `Get unexpected response ${JSON.stringify(putCredentialsResponse)}`,
        );
      }
      return putCredentialsResponse.data;
    } catch (error) {
      this.logger.error('Put credentials To MSP failed, ', error);
      throw new InternalServerError(
        `Put credentials To MSP failed with error: ${JSON.stringify(error)}`,
      );
    }
  }

  private async updateClientInformationByClientCredentialsDTO(
    clientInformation: ClientInformation,
    clientCredentialsDTO: CredentialsDTO,
  ): Promise<ClientInformation> {
    clientInformation.clientToken = clientCredentialsDTO.token;

    const clientCredentialsRoles = clientCredentialsDTO.roles;
    // remove old client roles
    await ClientCredentialsRole.destroy({
      where: {
        clientInformationId: clientInformation.id,
      },
    });
    // add new client roles
    const newClientCredentialsRoles = clientCredentialsRoles.map(
      (credentialsRoleDTO) =>
        ClientCredentialsRole.create(
          {
            ...(credentialsRoleDTO as Partial<ClientCredentialsRole>),
            [ClientCredentialsRoleProps.clientInformationId]:
              clientInformation.id,
            [ClientCredentialsRoleProps.cpoTenantId]:
              clientInformation.cpoTenantId,
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

  private findClientCredentialsUrl(clientVersion: ClientVersion): string {
    if (!clientVersion.endpoints || !clientVersion.endpoints.length) {
      throw new NotFoundError('Did not successfully retrieve version details');
    }

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

    return clientCredentialsEndpoint.url;
  }

  private async getRegisteredClientInformation(
    credentialsRequest: AdminUpdateCredentialsRequestDTO,
  ): Promise<ClientInformation> {
    const existingClientInformation =
      await this.clientInformationRepository.getClientInformation(
        credentialsRequest.cpoCountryCode,
        credentialsRequest.cpoPartyId,
        credentialsRequest.mspCountryCode,
        credentialsRequest.mspPartyId,
      );
    if (!existingClientInformation) {
      throw new NotFoundError(
        `Client information not found by ${credentialsRequest.cpoCountryCode} ${credentialsRequest.cpoPartyId} ${credentialsRequest.mspCountryCode} ${credentialsRequest.mspPartyId}`,
      );
    }
    if (!existingClientInformation.registered) {
      throw new InternalServerError(
        `The registration of the client information ${existingClientInformation.id} is not completed yet.`,
      );
    }
    return existingClientInformation;
  }

  private async getClientVersionByClientInformationAndVersionNumber(
    clientInformation: ClientInformation,
    versionNumber: VersionNumber,
  ): Promise<ClientVersion> {
    const clientVersionDetails: ClientVersion[] = await clientInformation.$get(
      ClientInformationProps.clientVersionDetails,
      {
        include: [Endpoint],
      },
    );
    const clientVersion = clientVersionDetails.find(
      (version) => version.version === versionNumber,
    );
    if (!clientVersion) {
      throw new NotFoundError(
        `ClientVersion ${versionNumber} not found in ClientInformation ${clientInformation.id}`,
      );
    }
    return clientVersion;
  }

  private async updateServerCredentials(
    clientInformation: ClientInformation,
    serverCredentialsDTO: CredentialsDTO,
    versionNumber: VersionNumber,
    ServerRoleDTOs: CredentialsRoleDTO[],
  ): Promise<ServerCredentialsRole[]> {
    await clientInformation.update({
      serverToken: serverCredentialsDTO.token,
    });
    const storedServerCredentialsRoles: ServerCredentialsRole[] =
      await this.storeServerCredentialsRoles(ServerRoleDTOs);
    await ServerVersion.update(
      {
        url: serverCredentialsDTO.url,
      },
      {
        where: {
          clientInformationId: clientInformation.id,
          version: versionNumber,
        },
      },
    );

    return storedServerCredentialsRoles;
  }

  private async updateClientCredentials(
    clientInformation: ClientInformation,
    clientCredentialsDTO: CredentialsDTO,
    versionNumber: VersionNumber,
  ): Promise<void> {
    await this.updateClientInformationByClientCredentialsDTO(
      clientInformation,
      clientCredentialsDTO,
    );
    await ClientVersion.update(
      {
        url: clientCredentialsDTO.url,
      },
      {
        where: {
          clientInformationId: clientInformation.id,
          version: versionNumber,
        },
      },
    );
  }

  private getClientInformationMatches(
    clientInformations: ClientInformation[],
    clientCountryCode: string,
    clientPartyId: string,
  ) {
    return clientInformations.filter((clientInformation) => {
      const clientCredentialsRoles =
        clientInformation[ClientInformationProps.clientCredentialsRoles];
      return clientCredentialsRoles.some((clientCredntialsRole) => {
        return (
          clientCredntialsRole.country_code === clientCountryCode &&
          clientCredntialsRole.party_id === clientPartyId
        );
      });
    });
  }
}
