import { OcpiGraphqlClient } from '../graphql/OcpiGraphqlClient';
import { GET_TENANT_VERSION_ENDPOINTS } from '../graphql/queries/tenantVersionEndpoints.queries';
import { VersionNumber } from '../model/VersionNumber';
import { Service } from 'typedi';
import { NotFoundError } from 'routing-controllers';
import { VersionDetailsResponseDTO } from '../model/DTO/VersionDetailsResponseDTO';
import { VersionListResponseDTO } from '../model/DTO/VersionListResponseDTO';

@Service()
export class VersionService {
  constructor(private ocpiGraphqlClient: OcpiGraphqlClient) {}

  async getVersions(): Promise<VersionListResponseDTO> {
    const response = await this.ocpiGraphqlClient.request<any>(
      GET_TENANT_VERSION_ENDPOINTS,
      { version: undefined }, // fetch all versions
    );
    const tenants = response.tenants || [];
    const versions = tenants.flatMap((tenant: any) => tenant.versions || []);
    return VersionListResponseDTO.build(
      versions.map((version: any) => ({
        version: version.version,
        url:
          version.endpoints.find((e: any) => e.identifier === 'versions')
            ?.url || '',
      })),
    );
  }

  async getVersionDetails(
    version: VersionNumber,
  ): Promise<VersionDetailsResponseDTO> {
    const response = await this.ocpiGraphqlClient.request<any>(
      GET_TENANT_VERSION_ENDPOINTS,
      { version },
    );
    const tenants = response.tenants || [];
    const tenantVersion = tenants
      .flatMap((tenant: any) => tenant.versions || [])
      .find((v: any) => v.version === version);
    if (!tenantVersion) {
      throw new NotFoundError('Version not found');
    }
    return VersionDetailsResponseDTO.build({
      version: tenantVersion.version,
      endpoints: tenantVersion.endpoints,
    });
  }
}
