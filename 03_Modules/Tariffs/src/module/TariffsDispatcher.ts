import { Service } from 'typedi';
import { CrudRepository } from '@citrineos/base';
import {
  OcpiTariff,
  OcpiTariffRepository,
  TariffsBroadcaster,
} from '@citrineos/ocpi-base';

@Service()
export class TariffsDispatcher {
  constructor(
    private readonly ocpiTariffRepository: OcpiTariffRepository,
    private readonly tariffsBroadcaster: TariffsBroadcaster,
  ) {}

  public initializeListeners() {
    (this.ocpiTariffRepository as unknown as CrudRepository<OcpiTariff>)
      .on('created', (tariffs) =>
        this.tariffsBroadcaster.broadcastOcpiUpdate(tariffs),
      )
      .on('updated', (tariffs) =>
        this.tariffsBroadcaster.broadcastOcpiUpdate(tariffs),
      )
      .on('deleted', (tariffs) =>
        this.tariffsBroadcaster.broadcastDeletionByKeys(
          tariffs.map((tariff) => tariff.key),
        ),
      );
  }
}
