import { Service } from 'typedi';
import { SequelizeRepository } from '@citrineos/data';
import { ServerConfig } from '../config/ServerConfig';
import { OcpiSequelizeInstance } from '../util/OcpiSequelizeInstance';
import { SystemConfig, UnauthorizedException } from '@citrineos/base';
import { ClientInformation } from '../model/ClientInformation';
import { OcpiNamespace } from '../util/OcpiNamespace';
import { ILogObj, Logger } from 'tslog';
import { ClientCredentialsRole } from '../model/ClientCredentialsRole';
import { CpoTenant } from '../model/CpoTenant';
import {
  ServerCredentialsRole,
  ServerCredentialsRoleProps,
} from '../model/ServerCredentialsRole';
import { BadRequestError, NotFoundError } from 'routing-controllers';
import { ServerCredentialsRoleRepository } from './ServerCredentialsRoleRepository';
import { ClientVersion } from '../model/ClientVersion';
import { Endpoint } from '../model/Endpoint';

@Service()
export class ClientInformationRepository extends SequelizeRepository<ClientInformation> {
  logger: Logger<ILogObj>;

  constructor(
    systemConfig: ServerConfig,
    logger: Logger<ILogObj>,
    ocpiSequelizeInstance: OcpiSequelizeInstance,
    readonly serverCredentialsRoleRepository: ServerCredentialsRoleRepository,
  ) {
    super(
      systemConfig as SystemConfig,
      OcpiNamespace.ClientInformation,
      logger,
      ocpiSequelizeInstance.sequelize,
    );
    this.logger = logger;
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

  public async getClientInformation(
    fromCountryCode: string,
    fromPartyId: string,
    toCountryCode: string,
    toPartyId: string,
  ): Promise<ClientInformation | undefined> {
    const serverCredentialsRole =
      await this.serverCredentialsRoleRepository.getServerCredentialsRoleByCountryCodeAndPartyId(
        fromCountryCode,
        fromPartyId,
      );
    if (!serverCredentialsRole) {
      return undefined;
    }
    return (
      await this.readAllByQuery({
        where: {
          cpoTenantId:
            serverCredentialsRole[ServerCredentialsRoleProps.cpoTenantId],
        },
        include: [
          {
            model: ClientCredentialsRole,
            where: { country_code: toCountryCode, party_id: toPartyId },
            required: true, // ensure the inner join
          },
        ],
      })
    )[0];
  }

  async getCpoTenantByServerCountryCodeAndPartyId(
    countryCode: string,
    partyId: string,
  ): Promise<CpoTenant> {
    const serverCredentialsRole =
      await this.serverCredentialsRoleRepository.getServerCredentialsRoleByCountryCodeAndPartyId(
        countryCode,
        partyId,
      );
    const cpoTenant: CpoTenant | null = await serverCredentialsRole.$get(
      ServerCredentialsRoleProps.cpoTenant,
    );
    if (!cpoTenant) {
      const msg = 'CpoTenant not found for server country code and party id';
      this.logger.debug(msg, countryCode, partyId);
      throw new NotFoundError(msg);
    }
    return cpoTenant;
  }

  async getClientInformationByServerCountryCodeAndPartyId(
    countryCode: string,
    partyId: string,
  ): Promise<ClientInformation[]> {
    const clientInformation = await this.readAllByQuery({
      where: {},
      include: [
        {
          model: CpoTenant,
          include: [
            {
              model: ServerCredentialsRole,
              where: { country_code: countryCode, party_id: partyId },
            },
          ],
        },
        {
          model: ClientVersion,
          include: [Endpoint],
        },
        ClientCredentialsRole,
      ],
    });
    if (!clientInformation || clientInformation.length === 0) {
      const msg =
        'Client information not found for server country code and party id';
      this.logger.debug(msg, countryCode, partyId);
      throw new NotFoundError(msg);
    }
    return clientInformation;
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
