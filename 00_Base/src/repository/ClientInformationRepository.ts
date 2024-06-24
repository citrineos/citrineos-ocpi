import { Service } from 'typedi';
import { SequelizeRepository } from '@citrineos/data';
import { OcpiServerConfig } from '../config/ocpi.server.config';
import { OcpiSequelizeInstance } from '../util/sequelize';
import { SystemConfig, UnauthorizedException } from '@citrineos/base';
import { ClientInformation } from '../model/ClientInformation';
import { OcpiNamespace } from '../util/ocpi.namespace';
import { ILogObj, Logger } from 'tslog';
import { ClientCredentialsRole } from '../model/ClientCredentialsRole';
import { CpoTenant } from '../model/CpoTenant';
import { ServerCredentialsRole } from '../model/ServerCredentialsRole';
import { BadRequestError } from 'routing-controllers';

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
    fromCountryCode?: string,
    fromPartyId?: string,
    toCountryCode?: string,
    toPartyId?: string,
  ): Promise<boolean> {
    const existingCredentials = await this.getExistingCredentials(
      token,
      fromCountryCode,
      fromPartyId,
      toCountryCode,
      toPartyId,
    );
    if (!existingCredentials) {
      throw new UnauthorizedException('Credentials not found for given token');
    } else {
      return true;
    }
  }

  private getExistingCredentials = async (
    token: string,
    fromCountryCode?: string,
    fromPartyId?: string,
    toCountryCode?: string,
    toPartyId?: string,
  ): Promise<ClientInformation | null> => {
    const query: any = {
      where: {
        serverToken: token,
      },
      include: [
        ClientCredentialsRole,
        {
          model: CpoTenant,
          include: [ServerCredentialsRole],
        },
      ],
    };
    const clientInformationList = await this.readAllByQuery(query); // todo should be read one by query
    const clientInformation = clientInformationList[0];
    if (
      clientInformation &&
      (fromCountryCode || fromPartyId || toCountryCode || toPartyId)
    ) {
      if (!fromCountryCode || !fromPartyId || !toCountryCode || !toPartyId) {
        throw new BadRequestError(
          'The following are all required: fromCountryCode, fromPartyId, toCountryCode, toPartyId',
        );
      }
      const matchingClientInformation =
        clientInformation.clientCredentialsRoles.some(
          (credentialsRole) =>
            credentialsRole.country_code === fromCountryCode &&
            credentialsRole.party_id === fromPartyId,
        );
      if (matchingClientInformation) {
        const matchingServerInformation =
          clientInformation.cpoTenant.serverCredentialsRoles.some(
            (credentialsRole) =>
              credentialsRole.country_code === toCountryCode &&
              credentialsRole.party_id === toPartyId,
          );
        if (matchingServerInformation) {
          return clientInformation;
        }
        return null;
      }
      return null;
    }
    if (clientInformationList && clientInformationList[0]) {
      return clientInformationList[0];
    }
    return null;
  };
}
