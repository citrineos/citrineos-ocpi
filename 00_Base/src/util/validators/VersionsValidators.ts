import { ModuleId } from '../../model/ModuleId';
import { VersionEndpoint } from '../../model/VersionEndpoint';
import { NotFoundError } from 'routing-controllers';

export function validateVersionEndpointByModuleId(
  endpoints: VersionEndpoint[],
  moduleId: ModuleId,
) {
  const versionEndpoint = endpoints.find(
    (endpoint) => endpoint.identifier === moduleId,
  );
  if (!versionEndpoint) {
    throw new NotFoundError(
      `VersionEndpoint for ${ModuleId.Credentials} not found`,
    );
  }
}
