import { Service } from 'typedi';
import { SequelizeRepository } from '@citrineos/data';
import { ServerConfig } from '../config/ServerConfig';
import { OcpiSequelizeInstance } from '../util/sequelize';
import { SystemConfig } from '@citrineos/base';
import { ClientCredentialsRole } from '../model/ClientCredentialsRole';
import { OcpiNamespace } from '../util/ocpi.namespace';
import { ILogObj, Logger } from 'tslog';

@Service()
export class ClientCredentialsRoleRepository extends SequelizeRepository<ClientCredentialsRole> {
  constructor(
    systemConfig: ServerConfig,
    logger: Logger<ILogObj>,
    ocpiSequelizeInstance: OcpiSequelizeInstance,
  ) {
    super(
      systemConfig as SystemConfig,
      OcpiNamespace.ClientCredentialsRole,
      logger,
      ocpiSequelizeInstance.sequelize,
    );
  }
}
