import {Service} from "typedi";
import {SequelizeRepository} from "@citrineos/data";
import {OcpiServerConfig} from "../config/ocpi.server.config";
import {OcpiLogger} from "../util/logger";
import {OcpiSequelizeInstance} from "../util/sequelize";
import {SystemConfig, UnauthorizedException} from "@citrineos/base";
import {ClientInformation} from "../model/client.information";

@Service()
export class ClientInformationRepository extends SequelizeRepository<ClientInformation> {
  constructor(
    ocpiSystemConfig: OcpiServerConfig,
    logger: OcpiLogger,
    ocpiSequelizeInstance: OcpiSequelizeInstance,
  ) {
    super(
      ocpiSystemConfig as SystemConfig,
      ClientInformation.name,
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
        clientToken: token,
      },
    };
    const clientInformationList = await this.readAllByQuery(query); // todo should be read one by query
    if (clientInformationList && countryCode && partyId) {
      const matchingClientInformation = clientInformationList.find((clientInformation) => {
        return clientInformation.clientCredentialsRoles
          .some((clientCredentialsRole) => clientCredentialsRole.country_code === countryCode && clientCredentialsRole.party_id === partyId);
      });
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
