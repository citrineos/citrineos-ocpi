import { Service } from 'typedi';
import { SequelizeRepository } from '@citrineos/data';
import { OcpiServerConfig } from '../config/ocpi.server.config';
import { OcpiSequelizeInstance } from '../util/sequelize';
import { SystemConfig, UnauthorizedException } from '@citrineos/base';
import { ClientInformation } from '../model/ClientInformation';
import { OcpiNamespace } from '../util/ocpi.namespace';
import { ILogObj, Logger } from 'tslog';
import {ClientCredentialsRole} from "../model/ClientCredentialsRole";

@Service()
export class ClientInformationRepository extends SequelizeRepository<ClientInformation> {
  constructor(
    ocpiSystemConfig: OcpiServerConfig,
    logger: Logger<ILogObj>,
    ocpiSequelizeInstance: OcpiSequelizeInstance,
  ) {
    super(
      ocpiSystemConfig as SystemConfig,
      OcpiNamespace.ClientInformation,
      logger,
      ocpiSequelizeInstance.sequelize,
    );
  }

  public async authorizeToken(
    token: string,
    countryCode?: string,
    partyId?: string,
  ): Promise<boolean> {
    const existingCredentials = await this.getExistingCredentials(
      token,
      countryCode,
      partyId,
    );
    if (!existingCredentials) {
      throw new UnauthorizedException('Credentials not found for given token');
    } else {
      return true;
    }
  }

  private getExistingCredentials = async (
    token: string,
    countryCode?: string,
    partyId?: string,
  ): Promise<ClientInformation | null> => {
    const query: any = {
      where: {
        serverToken: token,
      },
      include: [
          ClientCredentialsRole
      ]
    };
    const clientInformationList = await this.readAllByQuery(query); // todo should be read one by query
    if (clientInformationList && countryCode && partyId) {
      const matchingClientInformation = clientInformationList.find(
        (clientInformation) =>
          clientInformation.clientCredentialsRoles.some(
            (clientCredentialsRole) =>
              clientCredentialsRole.country_code === countryCode &&
              clientCredentialsRole.party_id === partyId,
          ),
      );
      if (matchingClientInformation) {
        return matchingClientInformation;
      }
      return null;
    }
    if (clientInformationList && clientInformationList[0]) {
      return clientInformationList[0];
    }
    return null;
  };
}
