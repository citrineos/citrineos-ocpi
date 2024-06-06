import {Service} from "typedi";
import {SequelizeRepository} from "@citrineos/data";
import {OcpiServerConfig} from "../config/ocpi.server.config";
import {OcpiLogger} from "../util/logger";
import {OcpiSequelizeInstance} from "../util/sequelize";
import {SystemConfig} from "@citrineos/base";
import {CpoTenant} from "../model/cpo.tenant";

@Service()
export class CpoTenantRepository extends SequelizeRepository<CpoTenant> {
  constructor(
    ocpiSystemConfig: OcpiServerConfig,
    logger: OcpiLogger,
    ocpiSequelizeInstance: OcpiSequelizeInstance,
  ) {
    super(
      ocpiSystemConfig as SystemConfig,
      CpoTenant.name,
      logger,
      ocpiSequelizeInstance.sequelize,
    );
  }
}
