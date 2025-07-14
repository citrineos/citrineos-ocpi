import { v4 as uuidv4 } from 'uuid';
import { Service } from 'typedi';
import { InternalServerError, NotFoundError } from 'routing-controllers';
import { ClientInformation } from '../model/ClientInformation';
import { OcpiLogger } from '../util/OcpiLogger';
import { VersionNumber } from '../model/VersionNumber';
import { VersionsClientApi } from '../trigger/VersionsClientApi';
import { AlreadyRegisteredException } from '../exception/AlreadyRegisteredException';
import { NotRegisteredException } from '../exception/NotRegisteredException';
import { CredentialsRoleDTO } from '../model/DTO/CredentialsRoleDTO';
import { Role } from '../model/Role';
import { BusinessDetailsDTO } from '../model/DTO/BusinessDetailsDTO';
import { ImageDTO } from '../model/DTO/ImageDTO';
import { ImageCategory } from '../model/ImageCategory';
import { ImageType } from '../model/ImageType';
import { CredentialsClientApi } from '../trigger/CredentialsClientApi';
import { OcpiGraphqlClient } from '../graphql/OcpiGraphqlClient';
import { ModuleId } from '../model/ModuleId';
import { InterfaceRole } from '../model/InterfaceRole';
import { CredentialsResponse } from '../model/CredentialsResponse';
import { OcpiResponseStatusCode } from '../model/OcpiResponse';
import { UnsuccessfulRequestException } from '../exception/UnsuccessfulRequestException';
import { OcpiParams } from '../trigger/util/OcpiParams';
import { OcpiEmptyResponse } from '../model/OcpiEmptyResponse';
import { buildPostCredentialsParams } from '../trigger/param/credentials/PostCredentialsParams';
import {
  DELETE_CPO_TENANT_BY_ID,
  GET_CPO_TENANT_BY_SERVER_COUNTRY_AND_PARTY_ID,
  GET_TENANT_BY_ID,
} from '../graphql/queries/cpoTenant.queries';
import {
  GET_CLIENT_INFORMATION_BY_SERVER_TOKEN,
  GET_CLIENT_INFORMATION_BY_CLIENT_COUNTRY_AND_PARTY_ID,
  DELETE_TENANT_PARTNER_BY_ID,
} from '../graphql/queries/clientInformation.queries';
import { CredentialsDTO } from '../model/DTO/CredentialsDTO';
import { ClientVersion } from '../model/ClientVersion';
import { Endpoint } from '../model/Endpoint';
import {
  CREATE_TENANT,
  UPDATE_TENANT,
  CREATE_TENANT_PARTNER,
  UPDATE_TENANT_PARTNER_PROFILE,
} from '../graphql/mutations/tenant.mutations';
import { GET_TENANT_VERSION_ENDPOINTS } from '../graphql/queries/tenantVersionEndpoints.queries';
import {
  GetClientInformationByClientQuery,
  GetCpoTenantByServerQuery,
  GetTenantByIdQuery,
  TenantPartners,
  GetTenantVersionEndpointsQuery,
  GetClientInformationByServerTokenQuery,
  Tenants,
} from '../graphql/types/graphql';
import { CpoTenant } from '../model/CpoTenant';
import { ClientCredentialsRole } from '../model/ClientCredentialsRole';
import { ServerVersion } from '../model/ServerVersion';
import { AdminUpdateCredentialsRequestDTO } from '../model/DTO/AdminUpdateCredentialsRequestDTO';
import { buildPutCredentialsParams } from '../trigger/param/credentials/PutCredentialsParams';
import { UnregisterClientRequestDTO } from '../model/UnregisterClientRequestDTO';
import { AdminCredentialsRequestDTO } from '../model/DTO/AdminCredentialsRequestDTO';

const CpoCredentialsRole = CredentialsRoleDTO.build(
  Role.CPO,
  'COS',
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
    readonly logger: OcpiLogger,
    readonly ocpiGraphqlClient: OcpiGraphqlClient,
    readonly versionsClientApi: VersionsClientApi,
    readonly credentialsClientApi: CredentialsClientApi,
  ) {}

  private toClientInformation(partner: TenantPartners): ClientInformation {
    const clientInfo = new ClientInformation();
    clientInfo.id = partner.id;
    clientInfo.clientToken = partner.partnerProfile.credentials.token;
    clientInfo.serverToken = partner.Tenant.serverCredential.token;
    clientInfo.registered = true;

    clientInfo.clientCredentialsRoles = partner.partnerProfile.roles.map(
      (role: any) => ClientCredentialsRole.build(role),
    );

    clientInfo.clientVersionDetails = [
      ClientVersion.build({
        version: partner.partnerProfile.version.version,
        url: partner.partnerProfile.version.url,
        endpoints: partner.partnerProfile.version.endpoints.map((ep: any) =>
          Endpoint.build(ep),
        ),
      }),
    ];

    clientInfo.serverVersionDetails = partner.Tenant.serverVersions.map(
      (version: any) =>
        ServerVersion.build({
          version: version.version,
          url: version.url,
          endpoints: version.endpoints.map((ep: any) => Endpoint.build(ep)),
        }),
    );

    clientInfo.cpoTenantId = partner.Tenant.id;
    clientInfo.cpoTenant = partner.Tenant as unknown as CpoTenant;
    return clientInfo;
  }

  async getClientInformationByClientCountryCodeAndPartyId(
    countryCode: string,
    partyId: string,
  ): Promise<ClientInformation> {
    const response =
      await this.ocpiGraphqlClient.request<GetClientInformationByClientQuery>(
        GET_CLIENT_INFORMATION_BY_CLIENT_COUNTRY_AND_PARTY_ID,
        { countryCode, partyId },
      );
    const partner = response.TenantPartners?.[0];
    if (!partner) {
      throw new NotFoundError(
        'Client information not found for client country code and party id',
      );
    }
    if (response.TenantPartners && response.TenantPartners.length > 1) {
      this.logger.warn(
        `Multiple client information entries found for country code ${countryCode} and party id ${partyId}. Returning the first one. All entries: ${JSON.stringify(response.TenantPartners)}`,
      );
    }
    return this.toClientInformation(partner as TenantPartners);
  }

  async getClientTokenByClientCountryCodeAndPartyId(
    countryCode: string,
    partyId: string,
  ): Promise<string> {
    const clientInfo =
      await this.getClientInformationByClientCountryCodeAndPartyId(
        countryCode,
        partyId,
      );
    if (!clientInfo.clientToken) {
      throw new NotFoundError('Client token not found');
    }
    return clientInfo.clientToken;
  }

  async getClientInformationByServerToken(
    token: string,
  ): Promise<ClientInformation> {
    const response =
      await this.ocpiGraphqlClient.request<GetClientInformationByServerTokenQuery>(
        GET_CLIENT_INFORMATION_BY_SERVER_TOKEN,
        { serverToken: token },
      );
    const partner = response.TenantPartners?.[0];
    if (!partner) {
      throw new NotFoundError('Credentials not found for server token');
    }
    if (response.TenantPartners && response.TenantPartners.length > 1) {
      this.logger.warn(
        `Multiple client information entries found for server token ${token}. Returning the first one. All entries: ${JSON.stringify(response.TenantPartners)}`,
      );
    }
    return this.toClientInformation(partner as TenantPartners);
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

    const clientVersion = await this.getVersionDetails(
      version,
      credentials.url,
      credentials.token,
    );
    const newServerToken = uuidv4();

    await this.ocpiGraphqlClient.request(UPDATE_TENANT_PARTNER_PROFILE, {
      partnerId: clientInformation.id,
      input: {
        protocol: 'OCPI',
        version: {
          version: clientVersion.version,
          url: clientVersion.url,
          endpoints: clientVersion.endpoints,
        },
        roles: credentials.roles,
        credentials: { token: credentials.token },
      } as any,
    });

    await this.ocpiGraphqlClient.request(UPDATE_TENANT, {
      id: clientInformation.cpoTenantId,
      input: {
        serverCredential: { token: newServerToken },
      },
    });

    clientInformation.clientToken = credentials.token;
    clientInformation.serverToken = newServerToken;
    clientInformation.registered = true;
    clientInformation.clientCredentialsRoles = credentials.roles as any;

    return clientInformation;
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
    const newServerToken = uuidv4();

    await this.ocpiGraphqlClient.request(UPDATE_TENANT_PARTNER_PROFILE, {
      partnerId: clientInformation.id,
      input: {
        protocol: 'OCPI',
        roles: credentials.roles,
        credentials: { token: credentials.token },
      } as any,
    });

    await this.ocpiGraphqlClient.request(UPDATE_TENANT, {
      id: clientInformation.cpoTenantId,
      input: {
        serverCredential: { token: newServerToken },
      },
    });

    clientInformation.clientToken = credentials.token;
    clientInformation.serverToken = newServerToken;
    clientInformation.clientCredentialsRoles = credentials.roles as any;

    return clientInformation;
  }

  async deleteCredentials(token: string): Promise<void> {
    const clientInfo = await this.getClientInformationByServerToken(token);
    const response = await this.ocpiGraphqlClient.request<{
      delete_TenantPartners: { affected_rows: number };
    }>(DELETE_TENANT_PARTNER_BY_ID, { id: clientInfo.id });
    if (response.delete_TenantPartners.affected_rows === 0) {
      throw new NotFoundError(
        'No client information found for the provided token',
      );
    }
  }

  async getCpoTenantByClientCountryCodeAndPartyId(
    countryCode: string,
    partyId: string,
  ): Promise<CpoTenant> {
    const clientInformation =
      await this.getClientInformationByClientCountryCodeAndPartyId(
        countryCode,
        partyId,
      );
    if (!clientInformation.cpoTenant) {
      throw new NotFoundError(
        `Cpo Tenant not found for client country code ${countryCode} and party id ${partyId}`,
      );
    }
    return clientInformation.cpoTenant;
  }

  async registerCredentialsTokenA(
    versionNumber: VersionNumber,
    credentials: CredentialsDTO,
  ): Promise<ClientInformation> {
    const { url, token: credentialsTokenA, roles } = credentials;
    const cpoRole = roles[0];

    const versionEndpointsResponse =
      await this.ocpiGraphqlClient.request<GetTenantVersionEndpointsQuery>(
        GET_TENANT_VERSION_ENDPOINTS,
        { version: versionNumber },
      );
    const serverVersionEndpoints = versionEndpointsResponse.Tenants?.find(
      (tenant) =>
        tenant.countryCode === cpoRole.country_code &&
        tenant.partyId == cpoRole.party_id,
    )?.serverVersions?.[0]?.endpoints;
    if (
      versionEndpointsResponse.Tenants &&
      versionEndpointsResponse.Tenants.length > 1
    ) {
      this.logger.warn(
        `Multiple tenants found for version ${versionNumber}. Returning the first one. All entries: ${JSON.stringify(versionEndpointsResponse.Tenants)}`,
      );
    }
    if (
      versionEndpointsResponse.Tenants?.[0]?.serverVersions &&
      versionEndpointsResponse.Tenants[0].serverVersions.length > 1
    ) {
      this.logger.warn(
        `Multiple server versions found for tenant. Returning the first one. All entries: ${JSON.stringify(versionEndpointsResponse.Tenants[0].serverVersions)}`,
      );
    }

    if (!serverVersionEndpoints) {
      throw new NotFoundError('Version endpoints not found');
    }
    const serverVersionUrl =
      serverVersionEndpoints.find(
        (e: any) => e.identifier === ModuleId.Versions,
      )?.url || '';

    const clientVersion = await this.getVersionDetails(
      versionNumber,
      url,
      credentialsTokenA,
    );
    const credentialsTokenB = uuidv4();

    const tenantResponse =
      await this.ocpiGraphqlClient.request<GetCpoTenantByServerQuery>(
        GET_CPO_TENANT_BY_SERVER_COUNTRY_AND_PARTY_ID,
        { countryCode: cpoRole.country_code, partyId: cpoRole.party_id },
      );
    let tenant: any = tenantResponse.Tenants?.[0];
    if (tenantResponse.Tenants && tenantResponse.Tenants.length > 1) {
      this.logger.warn(
        `Multiple tenants found for country code ${cpoRole.country_code} and party id ${cpoRole.party_id}. Returning the first one. All entries: ${JSON.stringify(tenantResponse.Tenants)}`,
      );
    }

    if (!tenant) {
      const createTenantResponse = await this.ocpiGraphqlClient.request<{
        insert_Tenants_one: { id: number };
      }>(CREATE_TENANT, {
        object: {
          name: cpoRole.business_details.name,
          countryCode: cpoRole.country_code,
          partyId: cpoRole.party_id,
          serverCredential: { token: credentialsTokenB },
          serverVersions: [
            {
              version: versionNumber,
              url: serverVersionUrl,
              endpoints: serverVersionEndpoints,
            },
          ],
        },
      });
      const tenantId = createTenantResponse.insert_Tenants_one.id;
      const tenantByIdResponse =
        await this.ocpiGraphqlClient.request<GetTenantByIdQuery>(
          GET_TENANT_BY_ID,
          { id: tenantId },
        );
      tenant = tenantByIdResponse.Tenants_by_pk;
      if (
        tenantByIdResponse.Tenants_by_pk &&
        Array.isArray(tenantByIdResponse.Tenants_by_pk) &&
        tenantByIdResponse.Tenants_by_pk.length > 1
      ) {
        this.logger.warn(
          `Multiple tenants found for id ${tenantId}. Returning the first one. All entries: ${JSON.stringify(tenantByIdResponse.Tenants_by_pk)}`,
        );
      }
      if (
        tenantByIdResponse.Tenants_by_pk &&
        Array.isArray(tenantByIdResponse.Tenants_by_pk) &&
        tenantByIdResponse.Tenants_by_pk.length > 1
      ) {
        this.logger.warn(
          `Multiple tenants found for id ${tenantId}. Returning the first one. All entries: ${JSON.stringify(tenantByIdResponse.Tenants_by_pk)}`,
        );
      }
    }

    const createPartnerResponse = await this.ocpiGraphqlClient.request<{
      insert_TenantPartners_one: { id: number };
    }>(CREATE_TENANT_PARTNER, {
      object: {
        tenantId: tenant.id,
        countryCode: cpoRole.country_code,
        partyId: cpoRole.party_id,
        partnerProfile: {
          protocol: 'OCPI',
          roles,
          version: {
            version: clientVersion.version,
            url: clientVersion.url,
            endpoints: clientVersion.endpoints,
          },
          credentials: { token: credentialsTokenA },
        },
      },
    });
    const partnerId = createPartnerResponse.insert_TenantPartners_one.id;

    const clientInformation =
      await this.getClientInformationByClientCountryCodeAndPartyId(
        cpoRole.country_code,
        cpoRole.party_id,
      );

    const clientCredentialsUrl = this.findClientCredentialsUrl(clientVersion);
    const postCredentialsResponse = await this.getPostCredentialsResponse(
      clientCredentialsUrl,
      versionNumber,
      credentialsTokenA,
      credentialsTokenB,
      serverVersionUrl,
    );

    await this.ocpiGraphqlClient.request(UPDATE_TENANT_PARTNER_PROFILE, {
      partnerId,
      input: {
        credentials: { token: postCredentialsResponse.data.token },
        roles: postCredentialsResponse.data.roles,
      },
    });

    clientInformation.clientToken = postCredentialsResponse.data.token;
    clientInformation.clientCredentialsRoles = postCredentialsResponse.data
      .roles as any;

    return clientInformation;
  }

  async deleteTenant(
    tenantId: string,
    versionNumber = VersionNumber.TWO_DOT_TWO_DOT_ONE,
  ): Promise<void> {
    const tenantResponse =
      await this.ocpiGraphqlClient.request<GetTenantByIdQuery>(
        GET_TENANT_BY_ID,
        { id: tenantId },
      );
    const tenant = tenantResponse.Tenants_by_pk;
    if (!tenant) {
      throw new NotFoundError('CpoTenant not found');
    }
    if (
      tenantResponse.Tenants_by_pk &&
      Array.isArray(tenantResponse.Tenants_by_pk) &&
      tenantResponse.Tenants_by_pk.length > 1
    ) {
      this.logger.warn(
        `Multiple tenants found for id ${tenantId}. Returning the first one. All entries: ${JSON.stringify(tenantResponse.Tenants_by_pk)}`,
      );
    }

    for (const partner of tenant.TenantPartners) {
      if (tenant.TenantPartners && tenant.TenantPartners.length > 1) {
        this.logger.warn(
          `Multiple tenant partners found for tenant id ${tenantId}. Returning the first one. All entries: ${JSON.stringify(tenant.TenantPartners)}`,
        );
      }
      const clientInfo = this.toClientInformation(partner as TenantPartners);
      await this.unregisterClientInformation(
        clientInfo,
        VersionNumber.TWO_DOT_TWO_DOT_ONE,
        partner.countryCode,
        partner.partyId,
        tenant.countryCode!,
        tenant.partyId!,
      );
    }

    const response = await this.ocpiGraphqlClient.request<{
      delete_Tenants: { affected_rows: number };
    }>(DELETE_CPO_TENANT_BY_ID, { id: tenantId });
    if (response.delete_Tenants.affected_rows === 0) {
      this.logger.warn(`Tenant with id ${tenantId} not found for deletion.`);
    }
  }

  async regenerateCredentialsToken(
    credentialsRequest: AdminUpdateCredentialsRequestDTO,
    versionNumber: VersionNumber,
  ): Promise<CredentialsDTO> {
    try {
      // 1. validation
      // expected received roles to be CPO
      const receivedRoles = credentialsRequest.roles;
      // validateRole(receivedRoles, Role.CPO);

      // expected registered ClientInformation to be found in the database
      const existingClientInformation =
        await this.getClientInformationByClientCountryCodeAndPartyId(
          credentialsRequest.mspCountryCode,
          credentialsRequest.mspPartyId,
        );

      // expected clientCredentialsUrl to be found in the database
      const clientVersion = existingClientInformation.clientVersionDetails.find(
        (version) => version.version === versionNumber,
      );
      if (
        existingClientInformation.clientVersionDetails &&
        existingClientInformation.clientVersionDetails.length > 1
      ) {
        this.logger.warn(
          `Multiple client version details found for client information ${existingClientInformation.id}. Returning the first one. All entries: ${JSON.stringify(existingClientInformation.clientVersionDetails)}`,
        );
      }
      if (!clientVersion) {
        throw new NotFoundError(
          `ClientVersion ${versionNumber} not found in ClientInformation ${existingClientInformation.id}`,
        );
      }
      const clientCredentialsUrl = this.findClientCredentialsUrl(clientVersion);

      // 2. generate new server token and update db data
      const serverCredentialsDTO: CredentialsDTO = CredentialsDTO.build(
        uuidv4(), // new server token
        credentialsRequest.url,
        receivedRoles,
      );

      await this.ocpiGraphqlClient.request(UPDATE_TENANT, {
        id: existingClientInformation.cpoTenantId,
        input: {
          serverCredential: { token: serverCredentialsDTO.token },
        },
      });

      // 3. send putCredentials request to MSP and update db data
      const clientCredentialsDTO = await this.putCredentialsToMSP(
        versionNumber,
        serverCredentialsDTO,
        existingClientInformation.clientToken,
        clientCredentialsUrl,
      );

      await this.ocpiGraphqlClient.request(UPDATE_TENANT_PARTNER_PROFILE, {
        partnerId: existingClientInformation.id,
        input: {
          credentials: { token: clientCredentialsDTO.token },
          roles: clientCredentialsDTO.roles,
        } as any,
      });

      // 4. return credentialsDTO result
      const serverCredentialsRoleDTOs = receivedRoles; // Assuming receivedRoles are the server roles
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
    if (!versions?.data) {
      throw new NotFoundError(
        'Versions list response was null or did not have expected data',
      );
    }
    if (versions.data && versions.data.length > 1) {
      this.logger.warn(
        `Multiple versions found for version ${versionNumber}. Returning the first one. All entries: ${JSON.stringify(versions.data)}`,
      );
    }
    const version = versions.data.find((v) => v.version === versionNumber);
    if (!version) {
      throw new NotFoundError('Matching version not found');
    }
    this.versionsClientApi.baseUrl = version.url;
    const versionDetails = await this.versionsClientApi.getVersionDetails({
      authorization: token,
      version: versionNumber,
    });
    if (!versionDetails?.data) {
      throw new NotFoundError('Matching version details not found');
    }
    if (
      versionDetails.data.endpoints &&
      versionDetails.data.endpoints.length > 1
    ) {
      this.logger.warn(
        `Multiple endpoints found for version ${versionNumber}. Returning the first one. All entries: ${JSON.stringify(versionDetails.data.endpoints)}`,
      );
    }
    return ClientVersion.build(
      {
        version: versionNumber,
        url: version.url,
        endpoints: versionDetails.data.endpoints,
      },
      { include: [Endpoint] },
    );
  }

  private findClientCredentialsUrl(clientVersion: ClientVersion): string {
    const endpoint = clientVersion.endpoints.find(
      (e) =>
        e.identifier === ModuleId.Credentials &&
        e.role === InterfaceRole.RECEIVER,
    );
    if (clientVersion.endpoints && clientVersion.endpoints.length > 1) {
      this.logger.warn(
        `Multiple endpoints found for client version. Returning the first one. All entries: ${JSON.stringify(clientVersion.endpoints)}`,
      );
    }
    if (!endpoint?.url) {
      throw new NotFoundError(
        'Did not successfully retrieve client credentials from version details',
      );
    }
    return endpoint.url;
  }

  private async getPostCredentialsResponse(
    clientCredentialsUrl: string,
    versionNumber: VersionNumber,
    credentialsTokenA: string,
    credentialsTokenB: string,
    serverVersionUrl: string,
  ): Promise<CredentialsResponse> {
    this.credentialsClientApi.baseUrl = clientCredentialsUrl;
    const response = await this.credentialsClientApi.postCredentials(
      buildPostCredentialsParams(
        versionNumber,
        credentialsTokenA,
        this.buildCredentialsDTO(credentialsTokenB, serverVersionUrl),
      ),
    );
    if (
      response?.status_code !== OcpiResponseStatusCode.GenericSuccessCode ||
      !response.data
    ) {
      throw new InternalServerError(
        'Could not successfully post credentials to client',
      );
    }
    return response;
  }

  private buildCredentialsDTO(token: string, url: string): CredentialsDTO {
    return CredentialsDTO.build(token, url, [CpoCredentialsRole]);
  }

  async unregisterClientInformation(
    clientInformation: ClientInformation,
    versionNumber: VersionNumber,
    clientCountryCode: string,
    clientPartyId: string,
    serverCountryCode: string,
    serverPartyId: string,
  ): Promise<void> {
    const clientVersion = (
      clientInformation.clientVersionDetails as ClientVersion[]
    ).find((cv) => cv.version === versionNumber);
    if (!clientVersion) {
      throw new NotFoundError(
        `Client version not found for client party id ${clientPartyId} and client country code ${clientCountryCode} and matching version ${versionNumber}`,
      );
    }
    const clientCredentialsUrl = this.findClientCredentialsUrl(clientVersion);
    await this.getDeleteCredentialsResponse(
      clientCredentialsUrl,
      versionNumber,
      clientInformation.clientToken,
      clientCountryCode,
      clientPartyId,
      serverCountryCode,
      serverPartyId,
    );
    await this.ocpiGraphqlClient.request(DELETE_TENANT_PARTNER_BY_ID, {
      id: clientInformation.id,
    });
  }

  async unregisterClient(
    request: UnregisterClientRequestDTO,
    versionNumber: VersionNumber,
  ): Promise<void> {
    const serverPartyId = request.serverPartyId;
    const serverCountryCode = request.serverCountryCode;
    const clientPartyId = request.clientPartyId;
    const clientCountryCode = request.clientCountryCode;

    const clientInformation =
      await this.getClientInformationByClientCountryCodeAndPartyId(
        clientCountryCode,
        clientPartyId,
      );

    if (!clientInformation) {
      throw new NotFoundError(
        `Client information not found for client party id ${clientPartyId} and client country code ${clientCountryCode}`,
      );
    }

    await this.unregisterClientInformation(
      clientInformation,
      versionNumber,
      clientCountryCode,
      clientPartyId,
      serverCountryCode,
      serverPartyId,
    );
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
      throw new UnsuccessfulRequestException(
        `Could not delete credentials. Request to client failed with message: ${e.message}`,
      );
    }
  }

  async generateCredentialsTokenA(
    credentialsRequest: AdminCredentialsRequestDTO,
    versionNumber: VersionNumber,
  ): Promise<CredentialsDTO> {
    const receivedRoles = credentialsRequest.roles;
    // validateRole(receivedRoles, Role.CPO);

    const versionEndpointsResponse =
      await this.ocpiGraphqlClient.request<GetTenantVersionEndpointsQuery>(
        GET_TENANT_VERSION_ENDPOINTS,
        { version: versionNumber },
      );
    const serverVersionEndpoints =
      versionEndpointsResponse.Tenants?.[0]?.serverVersions?.[0]?.endpoints;
    if (
      versionEndpointsResponse.Tenants &&
      versionEndpointsResponse.Tenants.length > 1
    ) {
      this.logger.warn(
        `Multiple tenants found for version ${versionNumber}. Returning the first one. All entries: ${JSON.stringify(versionEndpointsResponse.Tenants)}`,
      );
    }
    if (
      versionEndpointsResponse.Tenants?.[0]?.serverVersions &&
      versionEndpointsResponse.Tenants[0].serverVersions.length > 1
    ) {
      this.logger.warn(
        `Multiple server versions found for tenant. Returning the first one. All entries: ${JSON.stringify(versionEndpointsResponse.Tenants[0].serverVersions)}`,
      );
    }
    if (!serverVersionEndpoints) {
      throw new NotFoundError('Version endpoints not found');
    }
    const serverVersionUrl =
      serverVersionEndpoints.find(
        (e: any) => e.identifier === ModuleId.Versions,
      )?.url || '';

    const credentialsTokenA = uuidv4();
    const credentialsTokenB = uuidv4();

    const cpoRole = receivedRoles[0];
    const tenantResponse =
      await this.ocpiGraphqlClient.request<GetCpoTenantByServerQuery>(
        GET_CPO_TENANT_BY_SERVER_COUNTRY_AND_PARTY_ID,
        { countryCode: cpoRole.country_code, partyId: cpoRole.party_id },
      );
    let tenant = tenantResponse.Tenants?.[0];

    if (!tenant) {
      const createTenantResponse = await this.ocpiGraphqlClient.request<{
        insert_Tenants_one: { id: number };
      }>(CREATE_TENANT, {
        object: {
          name: cpoRole.business_details.name,
          countryCode: cpoRole.country_code,
          partyId: cpoRole.party_id,
          serverCredential: { token: credentialsTokenB },
          serverVersions: [
            {
              version: versionNumber,
              url: serverVersionUrl,
              endpoints: serverVersionEndpoints,
            },
          ],
        },
      });
      const tenantId = createTenantResponse.insert_Tenants_one.id;
      const tenantByIdResponse =
        await this.ocpiGraphqlClient.request<GetTenantByIdQuery>(
          GET_TENANT_BY_ID,
          { id: tenantId },
        );
      tenant = tenantByIdResponse.Tenants_by_pk as unknown as Tenants;
    }

    const createPartnerResponse = await this.ocpiGraphqlClient.request<{
      insert_TenantPartners_one: { id: number };
    }>(CREATE_TENANT_PARTNER, {
      object: {
        tenantId: tenant.id,
        countryCode: cpoRole.country_code,
        partyId: cpoRole.party_id,
        partnerProfile: {
          protocol: 'OCPI',
          roles: receivedRoles,
          version: {
            version: versionNumber,
            url: credentialsRequest.url,
            endpoints: serverVersionEndpoints,
          },
          credentials: { token: credentialsTokenA },
        },
      },
    });

    return CredentialsDTO.build(
      credentialsTokenA,
      credentialsRequest.url,
      receivedRoles,
    );
  }
}
