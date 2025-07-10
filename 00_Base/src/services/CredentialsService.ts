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
import { OcpiLogger } from '../util/OcpiLogger';
import { OcpiSequelizeInstance } from '../util/OcpiSequelizeInstance';
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
import { OcpiGraphqlClient } from '../graphql/OcpiGraphqlClient';
import { CpoTenant } from '../model/CpoTenant';
import { ServerCredentialsRole } from '../model/ServerCredentialsRole';
import { ServerVersion } from '../model/ServerVersion';
import { ModuleId } from '../model/ModuleId';
import { InterfaceRole } from '../model/InterfaceRole';
import { CredentialsResponse } from '../model/CredentialsResponse';
import { OcpiResponseStatusCode } from '../model/OcpiResponse';
import { UnregisterClientRequestDTO } from '../model/UnregisterClientRequestDTO';
import { AdminCredentialsRequestDTO } from '../model/DTO/AdminCredentialsRequestDTO';
import { validateVersionEndpointByModuleId } from '../util/validators/VersionsValidators';
import { validateRole } from '../util/validators/CredentialsValidators';
import { buildPutCredentialsParams } from '../trigger/param/credentials/PutCredentialsParams';
import { AdminUpdateCredentialsRequestDTO } from '../model/DTO/AdminUpdateCredentialsRequestDTO';
import { UnsuccessfulRequestException } from '../exception/UnsuccessfulRequestException';
import { OcpiParams } from '../trigger/util/OcpiParams';
import { OcpiEmptyResponse } from '../model/OcpiEmptyResponse';
import { VersionListResponseDTO } from '../model/DTO/VersionListResponseDTO';
import { buildPostCredentialsParams } from '../trigger/param/credentials/PostCredentialsParams';
import { GET_TENANT_PARTNER_BY_COUNTRY_AND_PARTY_ID } from '../graphql/queries/tenant.queries';
import {
  DELETE_CPO_TENANT_BY_ID,
  GET_CPO_TENANT_BY_CLIENT_COUNTRY_AND_PARTY_ID,
  GET_CPO_TENANT_BY_SERVER_COUNTRY_AND_PARTY_ID,
} from '../graphql/queries/cpoTenant.queries';
import {
  GET_CLIENT_INFORMATION_BY_SERVER_COUNTRY_AND_PARTY_ID,
  GET_CLIENT_INFORMATION_BY_CLIENT_COUNTRY_AND_PARTY_ID,
  DELETE_CLIENT_INFORMATION_BY_TOKEN,
  GET_CLIENT_INFORMATION_BY_SERVER_TOKEN,
} from '../graphql/queries/clientInformation.queries';
import { CredentialsDTO } from '../model/DTO/CredentialsDTO';
import { ClientVersion } from '../model/ClientVersion';
import { Endpoint } from '../model/Endpoint';
import {
  CREATE_TENANT,
  CREATE_TENANT_PARTNER,
  UPDATE_TENANT,
} from '../graphql/mutations/tenant.mutations';
import { GET_TENANT_VERSION_ENDPOINTS } from '../graphql/queries/tenantVersionEndpoints.queries';
import {
  GetClientInformationByClientQuery,
  GetClientInformationByServerQuery,
  GetCpoTenantByClientQuery,
  GetCpoTenantByServerQuery,
  GetTenantPartnerQuery,
  TenantPartners,
  Tenants,
} from '../graphql/types/graphql';
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
    readonly ocpiGraphqlClient: OcpiGraphqlClient,
    readonly versionsClientApi: VersionsClientApi,
    readonly credentialsClientApi: CredentialsClientApi,
  ) {}

  async getClientCredentialsRoleByCountryCodeAndPartyId(
    countryCode: string,
    partyId: string,
  ): Promise<ClientCredentialsRole> {
    const variables = { countryCode, partyId };
    const response =
      await this.ocpiGraphqlClient.request<GetTenantPartnerQuery>(
        GET_TENANT_PARTNER_BY_COUNTRY_AND_PARTY_ID,
        variables,
      );
    const partner = response.TenantPartners && response.TenantPartners[0];
    if (!partner) {
      const msg =
        'Client credentials role not found for country code and party id';
      this.logger.debug(msg, countryCode, partyId);
      throw new NotFoundError(msg);
    }
    const credentialRole = partner.partnerProfile.roles[0];
    return {
      country_code: partner.countryCode,
      party_id: partner.partyId,
      role: credentialRole.role,
      business_details: credentialRole.business_details,
      cpoTenantId: partner.Tenant.id,
    } as unknown as ClientCredentialsRole;
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
    const variables = { countryCode, partyId };
    const response =
      await this.ocpiGraphqlClient.request<GetCpoTenantByServerQuery>(
        GET_CPO_TENANT_BY_SERVER_COUNTRY_AND_PARTY_ID,
        variables,
      );
    const tenant = response.Tenants && response.Tenants[0];
    if (
      !tenant ||
      !tenant.serverCredentialsRoles ||
      tenant.serverCredentialsRoles.length === 0
    ) {
      const msg =
        'Server credentials role not found for country code and party id';
      this.logger.debug(msg, countryCode, partyId);
      throw new NotFoundError(msg);
    }
    const serverCredentialsRoles = tenant.serverCredentialsRoles[0];
    return {
      country_code: tenant.countryCode,
      party_id: tenant.partyId,
      role: serverCredentialsRoles.role,
      business_details: serverCredentialsRoles.businessDetails,
      cpoTenantId: tenant.id,
    } as unknown as ServerCredentialsRole;
  }

  async getCpoTenantByServerCountryCodeAndPartyId(
    countryCode: string,
    partyId: string,
  ): Promise<CpoTenant> {
    const variables = { countryCode, partyId };
    const response =
      await this.ocpiGraphqlClient.request<GetCpoTenantByServerQuery>(
        GET_CPO_TENANT_BY_SERVER_COUNTRY_AND_PARTY_ID,
        variables,
      );
    const tenant = response.Tenants && response.Tenants[0];
    if (!tenant) {
      const msg = 'Cpo Tenant not found for server country code and party id';
      this.logger.debug(msg, countryCode, partyId);
      throw new NotFoundError(msg);
    }
    return {
      serverCredentialsRoles: tenant.serverCredentialsRoles,
      clientInformation: tenant.TenantPartners,
    } as unknown as CpoTenant;
  }

  async getCpoTenantByClientCountryCodeAndPartyId(
    countryCode: string,
    partyId: string,
  ): Promise<CpoTenant> {
    const variables = { countryCode, partyId };
    const response =
      await this.ocpiGraphqlClient.request<GetCpoTenantByClientQuery>(
        GET_CPO_TENANT_BY_CLIENT_COUNTRY_AND_PARTY_ID,
        variables,
      );
    const tenant = response.Tenants && response.Tenants[0];
    if (!tenant) {
      const msg = 'Cpo Tenant not found for client country code and party id';
      this.logger.debug(msg, countryCode, partyId);
      throw new NotFoundError(msg);
    }
    return {
      serverCredentialsRoles: tenant.serverCredentialsRoles,
      clientInformation: tenant.TenantPartners,
    } as unknown as CpoTenant;
  }

  async getClientInformationByServerCountryCodeAndPartyId(
    countryCode: string,
    partyId: string,
  ): Promise<any[]> {
    const variables = { countryCode, partyId };
    const response =
      await this.ocpiGraphqlClient.request<GetClientInformationByServerQuery>(
        GET_CLIENT_INFORMATION_BY_SERVER_COUNTRY_AND_PARTY_ID,
        variables,
      );
    const tenants = response.Tenants;
    if (!tenants || tenants.length === 0) {
      const msg = 'Tenant not found for server country code and party id';
      this.logger.debug(msg, countryCode, partyId);
      throw new NotFoundError(msg);
    }
    //TODO: this information needs to be looked into
    return tenants.map((tenant) => ({
      clientToken: tenant.TenantPartners[0].partnerProfile.credentials.token,
      serverToken: tenant.serverCredential.token,
      registered: true,
      clientCredentialsRoles: tenant.TenantPartners[0].partnerProfile.roles,
      clientVersionDetails: tenant.TenantPartners[0].partnerProfile.version,
      serverVersionDetails: tenant.serverVersions,
      cpoTenantId: tenant.id,
    }));
  }

  async getClientInformationByClientCountryCodeAndPartyId(
    countryCode: string,
    partyId: string,
  ): Promise<ClientInformation> {
    const variables = { countryCode, partyId };
    const response =
      await this.ocpiGraphqlClient.request<GetClientInformationByClientQuery>(
        GET_CLIENT_INFORMATION_BY_CLIENT_COUNTRY_AND_PARTY_ID,
        variables,
      );
    const partners = response.TenantPartners;
    if (!partners || partners.length === 0) {
      const msg =
        'Client information not found for client country code and party id';
      this.logger.debug(msg, countryCode, partyId);
      throw new NotFoundError(msg);
    }
    const partner = partners[0];
    return {
      id: partner.id,
      clientToken: partner.partnerProfile.credentials.token,
      serverToken: partner.Tenant.serverCredential.token,
      registered: true,
      clientCredentialsRoles: partner.partnerProfile.roles,
      clientVersionDetails: partner.partnerProfile.version,
      serverVersionDetails: partner.Tenant.serverVersions[0],
      cpoTenantId: partner.Tenant.id,
      cpoTenant: partner.Tenant,
    } as unknown as ClientInformation;
  }

  async getClientInformationByServerToken(token: string): Promise<any> {
    const variables = { serverToken: token };
    const response = await this.ocpiGraphqlClient.request<any>(
      GET_CLIENT_INFORMATION_BY_SERVER_TOKEN,
      variables,
    );
    const partners = response.tenantPartners;
    if (!partners || partners.length === 0) {
      this.logger.debug('Client information not found for token', token);
      throw new NotFoundError('Credentials not found');
    }
    const partner = partners[0];
    return {
      id: partner.id,
      country_code: partner.countryCode,
      party_id: partner.partyId,
      role: partner.role,
      serverToken: partner.serverToken,
      clientToken: partner.clientToken,
      registered: partner.registered,
      business_details: partner.businessDetails,
      tenant: partner.tenant,
    };
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
          (role: any) => role.version !== version,
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
      // Use GraphQL mutation to delete client information by token
      const variables = { token };
      const response = await this.ocpiGraphqlClient.request<any>(
        DELETE_CLIENT_INFORMATION_BY_TOKEN,
        variables,
      );
      if (
        !response.deleteClientInformation ||
        response.deleteClientInformation.affected_rows === 0
      ) {
        throw new NotFoundError(
          'No client information found for the provided token',
        );
      }
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

    const versionEndpointsResponse = await this.ocpiGraphqlClient.request<any>(
      GET_TENANT_VERSION_ENDPOINTS,
      { version: versionNumber },
    );
    const serverVersions =
      versionEndpointsResponse.tenants &&
      versionEndpointsResponse.tenants[0] &&
      versionEndpointsResponse.tenants[0].versions;
    if (!serverVersions || !serverVersions[0]) {
      throw new NotFoundError('Version not found');
    }
    const serverVersion = serverVersions[0];
    const serverVersionUrl =
      serverVersion.endpoints.find(
        (e: any) => e.identifier === ModuleId.Versions,
      )?.url || 'https://plugfest.demo.citrineos.app:445/ocpi/versions';

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

    // Use GraphQL mutations to create/update tenant, partner, and client information as needed
    // (Assume storeServerCredentialsRoles and related logic already use GraphQL)
    // For demo, we skip direct model instantiation and saving
    // Instead, map the data as needed for OCPI
    // You may want to add a mutation here to create client information if needed

    // Simulate fetching the created/updated client information (replace with actual GraphQL call if needed)
    // For now, use getClientInformationByServerToken
    const clientInformation =
      await this.getClientInformationByServerToken(credentialsTokenA);

    const clientCredentialsUrl = this.findClientCredentialsUrl(clientVersion);
    try {
      const updatedClientInformation =
        await this.performPostAndReturnSavedClientCredentials(
          clientInformation,
          clientCredentialsUrl,
          versionNumber,
          credentialsTokenA,
          credentialsTokenB,
          serverVersionUrl,
        );
      this.logger.debug('updatedClientInformation', updatedClientInformation);
      return updatedClientInformation;
    } catch (e: any) {
      const msg = `Failed to register credentials - ${e.name} ${e.message}`;
      this.logger.error(msg, e);
      throw new BadRequestError(msg);
    }
  }

  async deleteTenant(
    tenantId: string,
    versionNumber = VersionNumber.TWO_DOT_TWO_DOT_ONE,
  ): Promise<void> {
    const tenantResponse =
      await this.ocpiGraphqlClient.request<GetCpoTenantByServerQuery>(
        GET_CPO_TENANT_BY_SERVER_COUNTRY_AND_PARTY_ID,
        { tenantId },
      );
    const tenant = tenantResponse.Tenants && tenantResponse.Tenants[0];
    if (!tenant) {
      throw new NotFoundError('CpoTenant not found');
    }
    const serverCredentialsRoles = tenant.serverCredentialsRoles;
    const serverCredentialsRole = serverCredentialsRoles[0];

    // Fetch all client information for this tenant using GraphQL
    const clientInformationsResponse =
      await this.ocpiGraphqlClient.request<GetClientInformationByClientQuery>(
        GET_CLIENT_INFORMATION_BY_SERVER_COUNTRY_AND_PARTY_ID,
        {
          countryCode: serverCredentialsRole.country_code,
          partyId: serverCredentialsRole.party_id,
        },
      );
    const clientInformations =
      clientInformationsResponse.TenantPartners?.flatMap(
        (t: any) => t.partners || [],
      );
    if (clientInformations && clientInformations.length > 0) {
      for (const clientInformation of clientInformations) {
        const clientCredentialsRoles =
          clientInformation.clientCredentialsRoles || [];
        for (const clientCredentialsRole of clientCredentialsRoles) {
          await this.unregisterClientInformation(
            clientInformation,
            versionNumber,
            clientCredentialsRole.country_code,
            clientCredentialsRole.party_id,
            serverCredentialsRole.country_code,
            serverCredentialsRole.party_id,
          );
        }
        // Use GraphQL mutation to delete client information by token
        await this.deleteCredentials(clientInformation.clientToken);
      }
    }
    // Use GraphQL mutation to delete the tenant (add mutation as needed)
    await this.ocpiGraphqlClient.request<any>(DELETE_CPO_TENANT_BY_ID, {
      id: tenantId,
    });
    return;
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

  async generateCredentialsTokenA(
    credentialsRequest: AdminCredentialsRequestDTO,
    versionNumber: VersionNumber,
  ): Promise<CredentialsDTO> {
    // The input roles must be CPO
    const receivedRoles = credentialsRequest.roles;
    validateRole(receivedRoles, Role.CPO);

    // Fetch version endpoints from Tenant (GraphQL)
    const versionEndpoints =
      await this.getVersionEndpointsFromTenant(versionNumber);
    validateVersionEndpointByModuleId(versionEndpoints, ModuleId.Credentials);

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
            endpoints: versionEndpoints.map((endpoint) => ({
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
  private async getVersionEndpointsFromTenant(
    versionNumber: VersionNumber,
  ): Promise<any[]> {
    // Use the new GraphQL query from queries/tenantVersionEndpoints.queries
    const variables = { version: versionNumber };
    const response = await this.ocpiGraphqlClient.request<any>(
      GET_TENANT_VERSION_ENDPOINTS,
      variables,
    );
    if (
      response.tenants &&
      response.tenants[0] &&
      response.tenants[0].versions &&
      response.tenants[0].versions[0] &&
      response.tenants[0].versions[0].endpoints
    ) {
      return response.tenants[0].versions[0].endpoints;
    }
    return [];
  }

  async unregisterClientInformation(
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
      (cv) => cv.version === versionNumber,
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
    ].find(
      (clientInformations) =>
        clientInformations.country_code === clientCountryCode &&
        clientInformations.party_id === clientPartyId,
    );
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

    let versions: VersionListResponseDTO | null = null;
    try {
      versions = await this.versionsClientApi.getVersions({
        version: versionNumber,
        authorization: token,
      });
    } catch (e: any) {
      const msg = `Could not get versions. Request to client failed with message: ${e.message}`;
      this.logger.error(msg);
      throw new NotFoundError(msg);
    }
    if (!versions || !versions.data) {
      const msg =
        'Versions list response was null or did not have expected data';
      this.logger.error(msg);
      throw new NotFoundError(msg);
    }

    const version = versions.data.find((v: any) => v.version === versionNumber);
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
  ): Promise<string | undefined> {
    // Use GraphQL to find the CPO tenant by country/party id
    let cpoTenantId: number | undefined;
    for (const role of serverCredentialsRoleDTOs) {
      const variables = {
        countryCode: role.country_code,
        partyId: role.party_id,
      };
      const response =
        await this.ocpiGraphqlClient.request<GetCpoTenantByServerQuery>(
          GET_CPO_TENANT_BY_SERVER_COUNTRY_AND_PARTY_ID,
          variables,
        );
      const tenant = response.Tenants && response.Tenants[0];
      if (tenant) {
        if (!cpoTenantId) {
          cpoTenantId = tenant.id;
        } else if (cpoTenantId !== tenant.id) {
          throw new BadRequestError(
            `ServerCredentialsRoles belongs to different CPO tenants`,
          );
        }
      }
    }
    return cpoTenantId ? cpoTenantId.toString() : undefined;
  }

  private async storeServerCredentialsRoles(
    credentialsRoleDTOs: CredentialsRoleDTO[],
  ): Promise<ServerCredentialsRole[]> {
    // Use GraphQL mutations to create or update tenants and partners as needed
    const storedServerCredentialsRoles: ServerCredentialsRole[] = [];
    for (const role of credentialsRoleDTOs) {
      // Try to get the tenant by country_code and party_id
      const tenantVariables = {
        countryCode: role.country_code,
        partyId: role.party_id,
      };
      let tenantId: string | undefined;
      try {
        const tenantResponse = await this.ocpiGraphqlClient.request<any>(
          GET_CPO_TENANT_BY_SERVER_COUNTRY_AND_PARTY_ID,
          tenantVariables,
        );
        const tenant = tenantResponse.tenants && tenantResponse.tenants[0];
        if (tenant) {
          tenantId = tenant.id;
          // Optionally update tenant if business details have changed
          await this.ocpiGraphqlClient.request<any>(UPDATE_TENANT, {
            id: tenantId,
            input: {
              country_code: role.country_code,
              party_id: role.party_id,
              businessDetails: role.business_details,
            },
          });
        } else {
          // Create tenant if not found
          const createTenantResponse =
            await this.ocpiGraphqlClient.request<any>(CREATE_TENANT, {
              input: {
                country_code: role.country_code,
                party_id: role.party_id,
                businessDetails: role.business_details,
              },
            });
          tenantId = createTenantResponse.createTenant.id;
        }
      } catch (e) {
        // If error, try to create tenant
        const createTenantResponse = await this.ocpiGraphqlClient.request<any>(
          CREATE_TENANT,
          {
            input: {
              country_code: role.country_code,
              party_id: role.party_id,
              businessDetails: role.business_details,
            },
          },
        );
        tenantId = createTenantResponse.createTenant.id;
      }
      // Now create or update the partner for this tenant
      await this.ocpiGraphqlClient.request<any>(CREATE_TENANT_PARTNER, {
        input: {
          country_code: role.country_code,
          party_id: role.party_id,
          role: role.role,
          businessDetails: role.business_details,
          tenantId: tenantId,
        },
      });
      // For now, just push a minimal ServerCredentialsRole object for compatibility
      storedServerCredentialsRoles.push({
        country_code: role.country_code,
        party_id: role.party_id,
        role: role.role,
        business_details: role.business_details,
        cpoTenantId: tenantId,
      } as unknown as ServerCredentialsRole);
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
  ): Promise<any> {
    // Use GraphQL to fetch the registered client information instead of repository
    const variables = {
      countryCode: credentialsRequest.cpoCountryCode,
      partyId: credentialsRequest.cpoPartyId,
    };
    const response =
      await this.ocpiGraphqlClient.request<GetClientInformationByServerQuery>(
        GET_CLIENT_INFORMATION_BY_SERVER_COUNTRY_AND_PARTY_ID,
        variables,
      );
    const tenants = response.Tenants;
    if (!tenants || tenants.length === 0) {
      throw new NotFoundError(
        `Client information not found by ${credentialsRequest.cpoCountryCode} ${credentialsRequest.cpoPartyId}`,
      );
    }
    // Find the partner matching the MSP country/party id
    const tenant = tenants[0];
    const partner = (tenant.TenantPartners || []).find(
      (p: any) =>
        p.countryCode === credentialsRequest.mspCountryCode &&
        p.partyId === credentialsRequest.mspPartyId,
    );
    if (!partner) {
      throw new NotFoundError(
        `Client information not found by ${credentialsRequest.cpoCountryCode} ${credentialsRequest.cpoPartyId} ${credentialsRequest.mspCountryCode} ${credentialsRequest.mspPartyId}`,
      );
    }
    // TODO('check if partner is registered')
    // if (!partner.registered) {
    //   throw new InternalServerError(
    //     `The registration of the client information ${partner.id} is not completed yet.`,
    //   );
    // }
    return partner;
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
      return clientCredentialsRoles.some(
        (clientCredntialsRole) =>
          clientCredntialsRole.country_code === clientCountryCode &&
          clientCredntialsRole.party_id === clientPartyId,
      );
    });
  }
}
