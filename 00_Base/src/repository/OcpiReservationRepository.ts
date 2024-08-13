import { Service } from 'typedi';
import { SequelizeRepository } from '@citrineos/data';
import { OcpiServerConfig } from '../config/ocpi.server.config';
import { ILogObj, Logger } from 'tslog';
import { OcpiSequelizeInstance } from '../util/sequelize';
import { OcpiNamespace } from '../util/ocpi.namespace';
import { SystemConfig } from '@citrineos/base';
import {
  OcpiReservation,
  OcpiReservationProps,
} from '../model/OcpiReservation';

@Service()
export class OcpiReservationRepository extends SequelizeRepository<OcpiReservation> {
  constructor(
    ocpiSystemConfig: OcpiServerConfig,
    logger: Logger<ILogObj>,
    ocpiSequelizeInstance: OcpiSequelizeInstance,
  ) {
    super(
      ocpiSystemConfig as SystemConfig,
      OcpiNamespace.OcpiReservation,
      logger,
      ocpiSequelizeInstance.sequelize,
    );
  }

  async createOrUpdateReservation(
    reservation: OcpiReservation,
  ): Promise<OcpiReservation | undefined> {
    const [storedReservation, created] = await this._readOrCreateByQuery({
      where: {
        // unique constraints
        [OcpiReservationProps.reservationId]:
          reservation[OcpiReservationProps.reservationId],
        [OcpiReservationProps.countryCode]:
          reservation[OcpiReservationProps.countryCode],
        [OcpiReservationProps.partyId]:
          reservation[OcpiReservationProps.partyId],
      },
      defaults: {
        [OcpiReservationProps.coreReservationId]:
          reservation[OcpiReservationProps.coreReservationId],
        [OcpiReservationProps.locationId]:
          reservation[OcpiReservationProps.locationId],
      },
    });

    if (!created) {
      return await this._updateByKey(
        {
          [OcpiReservationProps.locationId]:
            reservation[OcpiReservationProps.locationId],
        },
        storedReservation.id.toString(),
      );
    } else {
      return storedReservation;
    }
  }
}
