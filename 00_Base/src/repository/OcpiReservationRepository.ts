import { Service } from 'typedi';
import { SequelizeRepository } from '@citrineos/data';
import { ILogObj, Logger } from 'tslog';
import { OcpiSequelizeInstance } from '../util/OcpiSequelizeInstance';
import { OcpiNamespace } from '../util/OcpiNamespace';
import { SystemConfig } from '@citrineos/base';
import {
  OcpiReservation,
  OcpiReservationProps,
} from '../model/OcpiReservation';
import { ServerConfig } from '../config/ServerConfig';

@Service()
export class OcpiReservationRepository extends SequelizeRepository<OcpiReservation> {
  logger: Logger<ILogObj>;

  constructor(
    systemConfig: ServerConfig,
    logger: Logger<ILogObj>,
    ocpiSequelizeInstance: OcpiSequelizeInstance,
  ) {
    super(
      systemConfig as SystemConfig,
      OcpiNamespace.OcpiReservation,
      logger,
      ocpiSequelizeInstance.sequelize,
    );
    this.logger = logger;
  }

  async createOrUpdateReservation(
    reservation: OcpiReservation,
  ): Promise<OcpiReservation | undefined> {
    let existingReservation;
    try {
      existingReservation = await this.readOnlyOneByQuery({
        where: {
          // unique constraints
          [OcpiReservationProps.reservationId]:
            reservation[OcpiReservationProps.reservationId],
          [OcpiReservationProps.countryCode]:
            reservation[OcpiReservationProps.countryCode],
          [OcpiReservationProps.partyId]:
            reservation[OcpiReservationProps.partyId],
        },
      });
    } catch (e) {
      this.logger.error(e);
      return undefined;
    }

    if (!existingReservation) {
      return await this.create(reservation);
    } else {
      return await this._updateByKey(
        {
          [OcpiReservationProps.locationId]:
            reservation[OcpiReservationProps.locationId],
          [OcpiReservationProps.evseUid]:
            reservation[OcpiReservationProps.evseUid],
          [OcpiReservationProps.authorizationReference]:
            reservation[OcpiReservationProps.authorizationReference],
        },
        existingReservation.id.toString(),
      );
    }
  }
}
