import { OcpiGraphqlClient } from '../graphql/OcpiGraphqlClient';
import { GET_TENANT_BY_ID } from '../graphql/queries/tenantVersionEndpoints.queries';
import { VersionNumber } from '../model/VersionNumber';
import { Service } from 'typedi';
import { NotFoundError } from 'routing-controllers';
import { VersionDetailsResponseDTO } from '../model/DTO/VersionDetailsResponseDTO';
import { VersionListResponseDTO } from '../model/DTO/VersionListResponseDTO';
import { OcpiResponseStatusCode } from '../model/OcpiResponse';
import { ITenantDto, OCPIRegistration } from '@citrineos/base';
import { RegistrationMapper } from '../mapper/RegistrationMapper';
import {
  GetTenantByIdQueryResult,
  GetTenantByIdQueryVariables,
} from '../graphql/operations';

@Service()
export class VersionService {
  constructor(private ocpiGraphqlClient: OcpiGraphqlClient) {}

  async getVersions(tenantId: number): Promise<VersionListResponseDTO> {
    const response = await this.ocpiGraphqlClient.request<
      GetTenantByIdQueryResult,
      GetTenantByIdQueryVariables
    >(GET_TENANT_BY_ID, { id: tenantId });
    const tenant = response.Tenants[0] as ITenantDto;
    const versions: OCPIRegistration.Version[] = Array.from(
      tenant.serverProfileOCPI?.versionDetails.keys() || [],
    );
    return {
      data: versions.map((version: OCPIRegistration.Version) => ({
        version: RegistrationMapper.toVersionNumber(version.version),
        url: version.versionDetailsUrl!,
      })),
      status_code: OcpiResponseStatusCode.GenericSuccessCode,
      timestamp: new Date(),
    };
  }

  async getVersionDetails(
    tenantId: number,
    version: VersionNumber,
  ): Promise<VersionDetailsResponseDTO> {
    const response = await this.ocpiGraphqlClient.request<
      GetTenantByIdQueryResult,
      GetTenantByIdQueryVariables
    >(GET_TENANT_BY_ID, { id: tenantId });
    const tenant = response.Tenants[0] as ITenantDto;
    const tenantVersion: OCPIRegistration.Version | undefined =
      tenant.serverProfileOCPI?.versionDetails
        .keys()
        .find(
          (value: OCPIRegistration.Version) =>
            value.version === RegistrationMapper.toOCPIVersionNumber(version),
        );
    if (!tenantVersion) {
      throw new NotFoundError('Version not found');
    }
    return {
      data: {
        version: RegistrationMapper.toVersionNumber(tenantVersion.version),
        endpoints:
          tenant.serverProfileOCPI?.versionDetails
            .get(tenantVersion)
            ?.map((value: OCPIRegistration.Endpoint) => {
              const { identifier, role } =
                RegistrationMapper.toModuleAndRole(value);
              return {
                identifier,
                role,
                url: value.url,
              };
            }) || [],
      },
      status_code: OcpiResponseStatusCode.GenericSuccessCode,
      timestamp: new Date(),
    };
  }
}
