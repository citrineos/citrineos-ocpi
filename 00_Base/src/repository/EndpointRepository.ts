import { Service } from 'typedi';
import { SequelizeRepository } from '@citrineos/data';
import { OcpiServerConfig } from '../config/ocpi.server.config';
import { OcpiSequelizeInstance } from '../util/sequelize';
import { SystemConfig } from '@citrineos/base';
import { ClientInformation } from '../model/ClientInformation';
import { OcpiNamespace } from '../util/ocpi.namespace';
import { ILogObj, Logger } from 'tslog';
import { ClientCredentialsRole } from '../model/ClientCredentialsRole';
import {Endpoint} from "../model/Endpoint";
import {ModuleId} from "../model/ModuleId";
import {InterfaceRole} from "../model/InterfaceRole";
import {ClientVersion} from "../model/ClientVersion";

@Service()
export class EndpointRepository extends SequelizeRepository<Endpoint> {
  constructor(
    ocpiSystemConfig: OcpiServerConfig,
    logger: Logger<ILogObj>,
    ocpiSequelizeInstance: OcpiSequelizeInstance,
  ) {
    super(
      ocpiSystemConfig as SystemConfig,
      OcpiNamespace.Endpoint,
      logger,
      ocpiSequelizeInstance.sequelize,
    );
  }

  public async readEndpoint(
      toCountryCode: string,
      toPartyId: string,
      moduleID: ModuleId,
      role: InterfaceRole
  ): Promise<string|undefined> {
    const endPointEntry = (await this.readAllByQuery({
      where: {
        identifier: moduleID,
        role: role,
      },
      include: [{
        model: ClientVersion,
        include: [{
          model: ClientInformation,
          include: [{model: ClientCredentialsRole, where: {country_code: toCountryCode, party_id: toPartyId}}]
        }]
      }],
    }))[0];

    return endPointEntry?.url
  }
}
