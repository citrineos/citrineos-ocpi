import { Service } from 'typedi';
import { SequelizeRepository } from '@citrineos/data';
import { OcpiServerConfig } from '../config/ocpi.server.config';
import { OcpiSequelizeInstance } from '../util/sequelize';
import { SystemConfig } from '@citrineos/base';
import {
  ServerCredentialsRole,
  ServerCredentialsRoleProps,
} from '../model/ServerCredentialsRole';
import { OcpiNamespace } from '../util/ocpi.namespace';
import { ILogObj, Logger } from 'tslog';
import { NotFoundError } from 'routing-controllers';

@Service()
export class ServerCredentialsRoleRepository extends SequelizeRepository<ServerCredentialsRole> {
  logger: Logger<ILogObj>;

  constructor(
    ocpiSystemConfig: OcpiServerConfig,
    logger: Logger<ILogObj>,
    ocpiSequelizeInstance: OcpiSequelizeInstance,
  ) {
    super(
      ocpiSystemConfig as SystemConfig,
      OcpiNamespace.ServerCredentialsRole,
      logger,
      ocpiSequelizeInstance.sequelize,
    );
    this.logger = logger;
  }

  async getServerCredentialsRoleByCountryCodeAndPartyId(
    countryCode: string,
    partyId: string,
  ): Promise<ServerCredentialsRole> {
    const serverCredentialsRole = await this.readOnlyOneByQuery(
      {
        where: {
          [ServerCredentialsRoleProps.partyId]: partyId,
          [ServerCredentialsRoleProps.countryCode]: countryCode,
        },
      },
      OcpiNamespace.Credentials,
    );
    if (!serverCredentialsRole) {
      const msg =
        'Server credentials role not found for country code and party id';
      this.logger.debug(msg, countryCode, partyId);
      throw new NotFoundError('Server credentials not found');
    }
    return serverCredentialsRole;
  }
}
