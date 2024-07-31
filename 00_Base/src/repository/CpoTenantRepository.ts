import { Service } from 'typedi';
import { SequelizeRepository } from '@citrineos/data';
import { ServerConfig } from '../config/ServerConfig';
import { OcpiSequelizeInstance } from '../util/sequelize';
import { SystemConfig } from '@citrineos/base';
import { CpoTenant } from '../model/CpoTenant';
import { OcpiNamespace } from '../util/ocpi.namespace';
import { ILogObj, Logger } from 'tslog';

@Service()
export class CpoTenantRepository extends SequelizeRepository<CpoTenant> {
  constructor(
    systemConfig: ServerConfig,
    logger: Logger<ILogObj>,
    ocpiSequelizeInstance: OcpiSequelizeInstance,
  ) {
    super(
      systemConfig as SystemConfig,
      OcpiNamespace.CpoTenant,
      logger,
      ocpiSequelizeInstance.sequelize,
    );
  }
}
