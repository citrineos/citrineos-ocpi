import {Service} from 'typedi';
import {SequelizeRepository} from '@citrineos/data';
import {OcpiServerConfig} from '../config/ocpi.server.config';
import {OcpiSequelizeInstance} from '../util/sequelize';
import {SystemConfig} from '@citrineos/base';
import {ClientCredentialsRole} from '../model/ClientCredentialsRole';
import {OcpiNamespace} from '../util/ocpi.namespace';
import {ILogObj, Logger} from "tslog";

@Service()
export class ClientCredentialsRoleRepository extends SequelizeRepository<ClientCredentialsRole> {
  constructor(
    ocpiSystemConfig: OcpiServerConfig,
    logger: Logger<ILogObj>,
    ocpiSequelizeInstance: OcpiSequelizeInstance,
  ) {
    super(
      ocpiSystemConfig as SystemConfig,
      OcpiNamespace.ClientCredentialsRole,
      logger,
      ocpiSequelizeInstance.sequelize,
    );
  }
}
