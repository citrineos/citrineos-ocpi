import {Service} from "typedi";
import {SequelizeRepository} from "@citrineos/data";
import {OcpiServerConfig} from "../config/ocpi.server.config";
import {OcpiLogger} from "../util/logger";
import {OcpiSequelizeInstance} from "../util/sequelize";
import {SystemConfig} from "@citrineos/base";
import {ServerCredentialsRole} from "../model/server.credentials.role";
import {OcpiNamespace} from "../util/ocpi.namespace";

@Service()
export class ServerCredentialsRoleRepository extends SequelizeRepository<ServerCredentialsRole> {
  constructor(
    ocpiSystemConfig: OcpiServerConfig,
    logger: OcpiLogger,
    ocpiSequelizeInstance: OcpiSequelizeInstance,
  ) {
    super(
      ocpiSystemConfig as SystemConfig,
      OcpiNamespace.ServerCredentialsRole,
      logger,
      ocpiSequelizeInstance.sequelize,
    );
  }
}
