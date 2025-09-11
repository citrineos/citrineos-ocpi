// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { v4 as uuidv4 } from 'uuid';
import { Service } from 'typedi';
import { InternalServerError, NotFoundError } from 'routing-controllers';
import { OcpiLogger } from '../util/OcpiLogger';
import { VersionNumber } from '../model/VersionNumber';
import { VersionsClientApi } from '../trigger/VersionsClientApi';
import { AlreadyRegisteredException } from '../exception/AlreadyRegisteredException';
import { NotRegisteredException } from '../exception/NotRegisteredException';
import { CredentialsRoleDTO } from '../model/DTO/CredentialsRoleDTO';
import { CredentialsClientApi } from '../trigger/CredentialsClientApi';
import { OcpiGraphqlClient } from '../graphql/OcpiGraphqlClient';
import { CredentialsDTO } from '../model/DTO/CredentialsDTO';
import { Endpoint } from '../model/Endpoint';
import {
  DELETE_TENANT_PARTNER_BY_ID,
  UPDATE_TENANT_PARTNER_PROFILE,
} from '../graphql/queries/tenant.mutations';
import { UnregisterClientRequestDTO } from '../model/UnregisterClientRequestDTO';
import { AdminCredentialsRequestDTO } from '../model/DTO/AdminCredentialsRequestDTO';
import {
  DELETE_TENANT_PARTNER_BY_SERVER_TOKEN,
  GET_TENANT_PARTNER_BY_CPO_AND_AND_CLIENT,
  GET_TENANT_PARTNER_BY_SERVER_TOKEN,
} from '../graphql/queries/tenantPartner.queries';
import { ITenantPartnerDto } from '@citrineos/base';
import { RegistrationMapper } from '../mapper/RegistrationMapper';
import {
  DeleteTenantPartnerByServerTokenMutationResult,
  DeleteTenantPartnerByServerTokenMutationVariables,
  GetTenantPartnerByCpoClientAndModuleIdQueryResult,
  GetTenantPartnerByCpoClientAndModuleIdQueryVariables,
  GetTenantPartnerByServerTokenQueryResult,
  GetTenantPartnerByServerTokenQueryVariables,
  UpdateTenantPartnerProfileMutationResult,
  UpdateTenantPartnerProfileMutationVariables,
} from '../graphql/operations';

// const CpoCredentialsRole = CredentialsRoleDTO.build(
//   Role.CPO,
//   'COS',
//   'US',
//   BusinessDetailsDTO.build(
//     'CitrineOS',
//     'https://citrineos.github.io/',
//     ImageDTO.build(
//       'https://citrineos.github.io/assets/images/231002_Citrine_OS_Logo_CitrineOS_Logo_negative.svg',
//       'https://citrineos.github.io/assets/images/231002_Citrine_OS_Logo_CitrineOS_Logo_negative.svg',
//       ImageCategory.OTHER,
//       ImageType.png,
//       100,
//       100,
//     ),
//   ),
// );

@Service()
export class CredentialsService {
  constructor(
    readonly logger: OcpiLogger,
    readonly ocpiGraphqlClient: OcpiGraphqlClient,
    readonly versionsClientApi: VersionsClientApi,
    readonly credentialsClientApi: CredentialsClientApi,
  ) {}

  // async getClientTokenByClientCountryCodeAndPartyId(
  //   countryCode: string,
  //   partyId: string,
  // ): Promise<string> {
  //   const clientInfo =
  //     await this.getClientInformationByClientCountryCodeAndPartyId(
  //       countryCode,
  //       partyId,
  //     );
  //   if (!clientInfo.clientToken) {
  //     throw new NotFoundError('Client token not found');
  //   }
  //   return clientInfo.clientToken;
  // }

  async getCredentials(
    tenantPartner: ITenantPartnerDto,
  ): Promise<CredentialsDTO> {
    return RegistrationMapper.tenantPartnerToCredentialsDto(tenantPartner);
  }

  async postCredentials(
    partner: ITenantPartnerDto,
    credentials: CredentialsDTO,
    versionNumber: VersionNumber,
  ): Promise<CredentialsDTO> {
    if (partner.partnerProfileOCPI?.credentials) {
      throw new AlreadyRegisteredException();
    }
    if (
      versionNumber !==
      RegistrationMapper.toVersionNumber(
        partner.partnerProfileOCPI!.version.version,
      )
    ) {
      throw new NotFoundError(
        `TenantPartner expects ${partner.partnerProfileOCPI!.version.version}, received ${versionNumber}`,
      );
    }
    const tenantPartner = await this.getVersionDetails(
      partner,
      credentials.url,
    );

    const newServerToken = uuidv4();
    tenantPartner.partnerProfileOCPI!.serverCredentials.token = newServerToken;
    tenantPartner.partnerProfileOCPI!.credentials = {
      versionsUrl: credentials.url,
      token: credentials.token,
    };
    tenantPartner.partnerProfileOCPI!.roles = credentials.roles.map(
      (value: CredentialsRoleDTO) =>
        RegistrationMapper.toCredentialsRole(value),
    );

    await this.ocpiGraphqlClient.request<
      UpdateTenantPartnerProfileMutationResult,
      UpdateTenantPartnerProfileMutationVariables
    >(UPDATE_TENANT_PARTNER_PROFILE, {
      partnerId: tenantPartner.id!,
      input: tenantPartner.partnerProfileOCPI!,
    });

    return RegistrationMapper.tenantPartnerToCredentialsDto(tenantPartner);
  }

  async putCredentials(
    tenantPartner: ITenantPartnerDto,
    credentials: CredentialsDTO,
  ): Promise<CredentialsDTO> {
    if (!tenantPartner.partnerProfileOCPI?.credentials) {
      throw new NotRegisteredException();
    }

    const newServerToken = uuidv4();
    tenantPartner.partnerProfileOCPI!.serverCredentials.token = newServerToken;
    tenantPartner.partnerProfileOCPI!.credentials = {
      versionsUrl: credentials.url,
      token: credentials.token,
    };
    tenantPartner.partnerProfileOCPI!.roles = credentials.roles.map(
      (value: CredentialsRoleDTO) =>
        RegistrationMapper.toCredentialsRole(value),
    );

    await this.ocpiGraphqlClient.request<
      UpdateTenantPartnerProfileMutationResult,
      UpdateTenantPartnerProfileMutationVariables
    >(UPDATE_TENANT_PARTNER_PROFILE, {
      partnerId: tenantPartner.id!,
      input: tenantPartner.partnerProfileOCPI!,
    });

    return RegistrationMapper.tenantPartnerToCredentialsDto(tenantPartner);
  }

  async deleteCredentials(token: string): Promise<void> {
    const response = await this.ocpiGraphqlClient.request<
      DeleteTenantPartnerByServerTokenMutationResult,
      DeleteTenantPartnerByServerTokenMutationVariables
    >(DELETE_TENANT_PARTNER_BY_SERVER_TOKEN, { serverToken: token });
    if (!response.delete_TenantPartners?.affected_rows) {
      throw new NotFoundError(
        'No client information found for the provided token',
      );
    }
  }

  async registerCredentialsTokenA(
    cpoCountryCode: string,
    cpoPartyId: string,
    versionsUrl: string,
    credentials: CredentialsDTO,
    versionNumber: VersionNumber,
  ): Promise<CredentialsDTO> {
    const { url, token: credentialsTokenA, roles } = credentials;
    const partnerRole = roles[0];
    const response = await this.ocpiGraphqlClient.request<
      GetTenantPartnerByCpoClientAndModuleIdQueryResult,
      GetTenantPartnerByCpoClientAndModuleIdQueryVariables
    >(GET_TENANT_PARTNER_BY_CPO_AND_AND_CLIENT, {
      cpoCountryCode: cpoCountryCode,
      cpoPartyId: cpoPartyId,
      clientCountryCode: partnerRole.country_code,
      clientPartyId: partnerRole.party_id,
    });
    let tenantPartner = response.TenantPartners[0] as ITenantPartnerDto;
    if (tenantPartner.partnerProfileOCPI?.credentials) {
      throw new AlreadyRegisteredException();
    }
    if (
      versionNumber !==
      RegistrationMapper.toVersionNumber(
        tenantPartner.partnerProfileOCPI!.version.version,
      )
    ) {
      throw new NotFoundError(
        `TenantPartner expects ${tenantPartner.partnerProfileOCPI!.version.version}, received ${versionNumber}`,
      );
    }
    tenantPartner.partnerProfileOCPI!.credentials = {
      versionsUrl: url,
      token: credentialsTokenA,
    };
    tenantPartner.partnerProfileOCPI!.roles = roles.map(
      (value: CredentialsRoleDTO) =>
        RegistrationMapper.toCredentialsRole(value),
    );
    tenantPartner = await this.getVersionDetails(tenantPartner, url);

    const credentialsTokenB = uuidv4();
    tenantPartner.partnerProfileOCPI!.serverCredentials = {
      versionsUrl,
      token: credentialsTokenB,
    };

    await this.ocpiGraphqlClient.request<
      UpdateTenantPartnerProfileMutationResult,
      UpdateTenantPartnerProfileMutationVariables
    >(UPDATE_TENANT_PARTNER_PROFILE, {
      partnerId: tenantPartner.id!,
      input: tenantPartner.partnerProfileOCPI!,
    });

    const credentialsResponse = await this.credentialsClientApi.postCredentials(
      cpoCountryCode,
      cpoPartyId,
      tenantPartner.countryCode!,
      tenantPartner.partyId!,
      tenantPartner.partnerProfileOCPI!,
      RegistrationMapper.tenantPartnerToCredentialsDto(tenantPartner),
    );
    return credentialsResponse.data as CredentialsDTO;
  }

  async regenerateCredentialsToken(
    credentialsRequest: AdminCredentialsRequestDTO,
    versionNumber: VersionNumber,
  ): Promise<CredentialsDTO> {
    try {
      const response = await this.ocpiGraphqlClient.request<
        GetTenantPartnerByCpoClientAndModuleIdQueryResult,
        GetTenantPartnerByCpoClientAndModuleIdQueryVariables
      >(GET_TENANT_PARTNER_BY_CPO_AND_AND_CLIENT, {
        cpoCountryCode: credentialsRequest.role.country_code,
        cpoPartyId: credentialsRequest.role.party_id,
        clientCountryCode: credentialsRequest.mspCountryCode,
        clientPartyId: credentialsRequest.mspPartyId,
      });
      const tenantPartner = response.TenantPartners[0] as ITenantPartnerDto;
      const newCredentialsToken = uuidv4();
      tenantPartner.partnerProfileOCPI!.serverCredentials.versionsUrl =
        credentialsRequest.url;
      tenantPartner.partnerProfileOCPI!.serverCredentials.token =
        newCredentialsToken;
      tenantPartner.partnerProfileOCPI!.version.version =
        RegistrationMapper.toOCPIVersionNumber(versionNumber);
      const newCredentialsDto =
        RegistrationMapper.tenantPartnerToCredentialsDto(tenantPartner);

      await this.ocpiGraphqlClient.request<
        UpdateTenantPartnerProfileMutationResult,
        UpdateTenantPartnerProfileMutationVariables
      >(UPDATE_TENANT_PARTNER_PROFILE, {
        partnerId: tenantPartner.id!,
        input: tenantPartner.partnerProfileOCPI!,
      });

      const putCredentialsResponse =
        await this.credentialsClientApi.putCredentials(
          credentialsRequest.role.country_code,
          credentialsRequest.role.party_id,
          credentialsRequest.mspCountryCode,
          credentialsRequest.mspPartyId,
          tenantPartner.partnerProfileOCPI!,
          newCredentialsDto,
        );

      tenantPartner.partnerProfileOCPI!.credentials = {
        versionsUrl: putCredentialsResponse!.data!.url!,
        token: putCredentialsResponse?.data?.token,
      };
      tenantPartner.partnerProfileOCPI!.roles =
        putCredentialsResponse?.data?.roles.map((value: CredentialsRoleDTO) =>
          RegistrationMapper.toCredentialsRole(value),
        );

      await this.ocpiGraphqlClient.request<
        UpdateTenantPartnerProfileMutationResult,
        UpdateTenantPartnerProfileMutationVariables
      >(UPDATE_TENANT_PARTNER_PROFILE, {
        partnerId: tenantPartner.id!,
        input: tenantPartner.partnerProfileOCPI!,
      });

      return newCredentialsDto;
    } catch (error) {
      this.logger.error('Regenerate credentials token failed, ', error);
      throw new InternalServerError(
        `Regenerate credentials token failed, ${JSON.stringify(error)}`,
      );
    }
  }

  private async getVersionDetails(
    tenantPartner: ITenantPartnerDto,
    versionsUrl?: string,
  ): Promise<ITenantPartnerDto> {
    const versions = await this.versionsClientApi.getVersions(
      tenantPartner.tenant!.countryCode!,
      tenantPartner.tenant!.partyId!,
      tenantPartner.countryCode!,
      tenantPartner.partyId!,
      tenantPartner.partnerProfileOCPI!,
      versionsUrl,
    );
    if (!versions?.data) {
      throw new NotFoundError(
        'Versions list response was null or did not have expected data',
      );
    }
    const versionNumber = RegistrationMapper.toVersionNumber(
      tenantPartner.partnerProfileOCPI!.version.version,
    );
    const version = versions.data.find((v) => v.version === versionNumber);
    if (!version) {
      throw new NotFoundError('Matching version not found');
    }
    tenantPartner.partnerProfileOCPI!.version.versionDetailsUrl = version.url;
    const versionDetails = await this.versionsClientApi.getVersionDetails(
      tenantPartner.tenant!.countryCode!,
      tenantPartner.tenant!.partyId!,
      tenantPartner.countryCode!,
      tenantPartner.partyId!,
      tenantPartner.partnerProfileOCPI!,
      version.url,
    );
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
    tenantPartner.partnerProfileOCPI!.endpoints =
      versionDetails.data.endpoints.map((value: Endpoint) =>
        RegistrationMapper.toEndpoint(value),
      );
    return tenantPartner;
  }

  // private findClientCredentialsUrl(clientVersion: ClientVersion): string {
  //   const endpoint = clientVersion.endpoints.find(
  //     (e) =>
  //       e.identifier === ModuleId.Credentials &&
  //       e.role === InterfaceRole.RECEIVER,
  //   );
  //   if (clientVersion.endpoints && clientVersion.endpoints.length > 1) {
  //     this.logger.warn(
  //       `Multiple endpoints found for client version. Returning the first one. All entries: ${JSON.stringify(clientVersion.endpoints)}`,
  //     );
  //   }
  //   if (!endpoint?.url) {
  //     throw new NotFoundError(
  //       'Did not successfully retrieve client credentials from version details',
  //     );
  //   }
  //   return endpoint.url;
  // }

  async unregisterClient(request: UnregisterClientRequestDTO): Promise<void> {
    const response = await this.ocpiGraphqlClient.request<
      GetTenantPartnerByCpoClientAndModuleIdQueryResult,
      GetTenantPartnerByCpoClientAndModuleIdQueryVariables
    >(GET_TENANT_PARTNER_BY_CPO_AND_AND_CLIENT, {
      cpoCountryCode: request.serverCountryCode,
      cpoPartyId: request.serverPartyId,
      clientCountryCode: request.clientCountryCode,
      clientPartyId: request.clientPartyId,
    });
    const tenantPartner = response.TenantPartners[0] as ITenantPartnerDto;
    await this.credentialsClientApi.deleteCredentials(
      request.serverCountryCode,
      request.serverPartyId,
      request.clientCountryCode,
      request.clientPartyId,
      tenantPartner.partnerProfileOCPI!,
    );

    await this.ocpiGraphqlClient.request(DELETE_TENANT_PARTNER_BY_ID, {
      id: tenantPartner.id,
    });
  }

  async generateCredentialsTokenA(
    credentialsRequest: AdminCredentialsRequestDTO,
    versionNumber: VersionNumber,
  ): Promise<CredentialsDTO> {
    const response = await this.ocpiGraphqlClient.request<
      GetTenantPartnerByCpoClientAndModuleIdQueryResult,
      GetTenantPartnerByCpoClientAndModuleIdQueryVariables
    >(GET_TENANT_PARTNER_BY_CPO_AND_AND_CLIENT, {
      cpoCountryCode: credentialsRequest.role.country_code,
      cpoPartyId: credentialsRequest.role.party_id,
      clientCountryCode: credentialsRequest.mspCountryCode,
      clientPartyId: credentialsRequest.mspPartyId,
    });
    const tenantPartner = response.TenantPartners[0] as ITenantPartnerDto;
    if (tenantPartner.partnerProfileOCPI) {
      throw new Error(
        `TenantPartner already has credentials token A: ${JSON.stringify(tenantPartner.partnerProfileOCPI)}`,
      );
    }

    const credentialsTokenA = uuidv4();
    tenantPartner.partnerProfileOCPI = {
      serverCredentials: {
        versionsUrl: credentialsRequest.url,
        token: credentialsTokenA,
      },
      version: {
        version: RegistrationMapper.toOCPIVersionNumber(versionNumber),
      },
    };

    await this.ocpiGraphqlClient.request<
      UpdateTenantPartnerProfileMutationResult,
      UpdateTenantPartnerProfileMutationVariables
    >(UPDATE_TENANT_PARTNER_PROFILE, {
      partnerId: tenantPartner.id!,
      input: tenantPartner.partnerProfileOCPI!,
    });

    return RegistrationMapper.tenantPartnerToCredentialsDto(tenantPartner);
  }
}
