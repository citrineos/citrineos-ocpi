import { Service } from 'typedi';
import { OcpiGraphqlClient } from '../graphql/OcpiGraphqlClient';
import { ILogObj, Logger } from 'tslog';
import { OcpiEvse } from '../model/OcpiEvse';
import { OCPI_EVSE_UPSERT_MUTATION } from '../graphql/queries/ocpiEvse.queries';

@Service()
export class OcpiEvseRepository {
  constructor(
    private readonly logger: Logger<ILogObj>,
    private readonly ocpiGraphqlClient: OcpiGraphqlClient,
  ) {}

  public async createOrUpdateOcpiEvse(
    ocpiEvse: Partial<OcpiEvse>,
  ): Promise<OcpiEvse | undefined> {
    this.logger.debug(`createOrUpdateOcpiEvse OCPI evse`, ocpiEvse);
    try {
      const variables = { object: ocpiEvse };
      const response = await this.ocpiGraphqlClient.request<{
        insert_OcpiEvses_one: OcpiEvse[];
      }>(OCPI_EVSE_UPSERT_MUTATION, variables);
      this.logger.debug('createOrUpdateOcpiEvse response', response);
      return response.insert_OcpiEvses_one[0];
    } catch (e) {
      this.logger.error('Error while updating ocpi evse', e);
      return undefined;
    }
  }
}
