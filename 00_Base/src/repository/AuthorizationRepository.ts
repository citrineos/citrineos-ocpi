import { OcpiSequelizeInstance } from '../util/sequelize';
import { SequelizeAuthorizationRepository } from '@citrineos/data';
import { OcpiServerConfig } from '../config/ocpi.server.config';
import { OcpiLogger } from '../util/logger';
import { SystemConfig } from '@citrineos/base';
import { Service } from 'typedi';


@Service()
export class AuthorizationRepository extends SequelizeAuthorizationRepository {
  //TODO initialize repository
  constructor(
    ocpiSystemConfig: OcpiServerConfig,
    private readonly logger: OcpiLogger,
    ocpiSequelizeInstance: OcpiSequelizeInstance,
  ) {
    super(
      ocpiSystemConfig as SystemConfig,
      logger,
      ocpiSequelizeInstance.sequelize,
      //TODO add the other CRUD Repos?
    );
  }
}