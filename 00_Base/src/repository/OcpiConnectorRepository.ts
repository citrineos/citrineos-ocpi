import { Service } from 'typedi';
import { OcpiGraphqlClient } from '../graphql/OcpiGraphqlClient';
import { ILogObj, Logger } from 'tslog';
import { OcpiConnector } from '../model/OcpiConnector';
import { OCPI_CONNECTOR_UPSERT_MUTATION } from '../graphql/queries/ocpiConnector.queries';

@Service()
export class OcpiConnectorRepository {
  constructor(
    private readonly logger: Logger<ILogObj>,
    private readonly ocpiGraphqlClient: OcpiGraphqlClient,
  ) {}

  public async createOrUpdateOcpiConnector(
    ocpiConnector: Partial<OcpiConnector>,
  ): Promise<OcpiConnector | undefined> {
    this.logger.debug(
      `createOrUpdateOcpiConnector OCPI connector`,
      ocpiConnector,
    );
    try {
      const variables = { object: ocpiConnector };
      const response = await this.ocpiGraphqlClient.request<{
        insert_OcpiConnectors_one: OcpiConnector[];
      }>(OCPI_CONNECTOR_UPSERT_MUTATION, variables);
      this.logger.debug('createOrUpdateOcpiConnector response', response);
      return response.insert_OcpiConnectors_one[0];
    } catch (e) {
      this.logger.error('Error while updating ocpi connector', e);
      return undefined;
    }
  }
}
