import { Service } from 'typedi';
import { SequelizeRepository } from '@citrineos/data';
import { OcpiServerConfig } from '../config/ocpi.server.config';
import { OcpiSequelizeInstance } from '../util/sequelize';
import { SystemConfig } from '@citrineos/base';
import { CpoTenant } from '../model/CpoTenant';
import { OcpiNamespace } from '../util/ocpi.namespace';
import { OcpiLogger } from '../util/ocpi.logger';

@Service()
export class CpoTenantRepository extends SequelizeRepository<CpoTenant> {
  constructor(
    ocpiSystemConfig: OcpiServerConfig,
    logger: OcpiLogger,
    ocpiSequelizeInstance: OcpiSequelizeInstance,
  ) {
    super(
      ocpiSystemConfig as SystemConfig,
      OcpiNamespace.CpoTenant,
      logger,
      ocpiSequelizeInstance.sequelize,
    );
  }
}
