import { Service } from 'typedi';
import { SequelizeRepository } from '@citrineos/data';
import { OcpiSequelizeInstance } from '../util/sequelize';
import { SystemConfig } from '@citrineos/base';
import {
  ServerCredentialsRole,
  ServerCredentialsRoleProps,
} from '../model/ServerCredentialsRole';
import { OcpiNamespace } from '../util/ocpi.namespace';
import { ILogObj, Logger } from 'tslog';
import { NotFoundError } from 'routing-controllers';
import { CredentialsRoleDTO } from '../model/DTO/CredentialsRoleDTO';
import { BusinessDetails } from '../model/BusinessDetails';
import { Image } from '../model/Image';
import { Role } from '../model/Role';
import { ServerConfig } from '../config/ServerConfig';

@Service()
export class ServerCredentialsRoleRepository extends SequelizeRepository<ServerCredentialsRole> {
  logger: Logger<ILogObj>;

  constructor(
    systemConfig: ServerConfig,
    logger: Logger<ILogObj>,
    ocpiSequelizeInstance: OcpiSequelizeInstance,
  ) {
    super(
      systemConfig as SystemConfig,
      OcpiNamespace.ServerCredentialsRole,
      logger,
      ocpiSequelizeInstance.sequelize,
    );
    this.logger = logger;
  }

  async getServerCredentialsRoleByCountryCodeAndPartyId(
    countryCode: string,
    partyId: string,
  ): Promise<ServerCredentialsRole> {
    const serverCredentialsRole = await this.readOnlyOneByQuery(
      {
        where: {
          [ServerCredentialsRoleProps.partyId]: partyId,
          [ServerCredentialsRoleProps.countryCode]: countryCode,
        },
      },
      OcpiNamespace.Credentials,
    );
    if (!serverCredentialsRole) {
      const msg = `Server credentials role not found for country code ${countryCode} and party id ${partyId}`;
      this.logger.debug(msg, countryCode, partyId);
      throw new NotFoundError('Server credentials not found');
    }
    return serverCredentialsRole;
  }

  async createOrUpdateServerCredentialsRoles(
    credentialsRoleDTOs: CredentialsRoleDTO[],
    cpoTenantId: number,
  ): Promise<ServerCredentialsRole[]> {
    const storedRoles: ServerCredentialsRole[] = [];

    await this.s.transaction(async (transaction) => {
      for (const credentialsRoleDTO of credentialsRoleDTOs) {
        const [storedRole, created] = await ServerCredentialsRole.findOrCreate({
          where: {
            [ServerCredentialsRoleProps.partyId]: credentialsRoleDTO.party_id,
            [ServerCredentialsRoleProps.countryCode]:
              credentialsRoleDTO.country_code,
          },
          defaults: {
            [ServerCredentialsRoleProps.role]: Role.CPO,
            [ServerCredentialsRoleProps.businessDetails]:
              credentialsRoleDTO.business_details,
            [ServerCredentialsRoleProps.cpoTenantId]: cpoTenantId,
          },
          include: [
            {
              model: BusinessDetails,
              include: [Image],
            },
          ],
          transaction: transaction,
        });

        if (!created) {
          // update business details and its nested image
          const storedBusinessDetails = await BusinessDetails.findOne({
            where: { serverCredentialsRoleId: storedRole.id },
            include: [Image],
            transaction: transaction,
          });
          if (storedBusinessDetails) {
            await storedBusinessDetails.update(
              {
                ...credentialsRoleDTO.business_details,
              },
              { transaction: transaction },
            );
            if (
              credentialsRoleDTO.business_details.logo &&
              storedBusinessDetails.logo
            ) {
              await Image.update(
                {
                  ...credentialsRoleDTO.business_details.logo,
                },
                {
                  transaction: transaction,
                  where: { businessDetailsId: storedBusinessDetails.id },
                },
              );
            } else if (credentialsRoleDTO.business_details.logo) {
              await Image.create(
                {
                  ...credentialsRoleDTO.business_details.logo,
                  businessDetailsId: storedBusinessDetails.id,
                },
                { transaction: transaction },
              );
            }
          }

          // reload stored role
          await storedRole.reload({
            transaction: transaction,
            include: [
              {
                model: BusinessDetails,
                include: [Image],
              },
            ],
          });
        }

        storedRoles.push(storedRole);
      }
    });

    return storedRoles;
  }
}
