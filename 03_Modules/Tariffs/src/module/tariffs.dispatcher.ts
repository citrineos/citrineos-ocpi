import {Service} from 'typedi';
import {SequelizeTariffRepository, Tariff as OcppTariff} from "@citrineos/data";
import {CrudRepository} from "@citrineos/base";
import {TariffsBroadcaster} from '@citrineos/ocpi-base';

@Service()
export class TariffsDispatcher {

    constructor(
        private readonly tariffRepository: SequelizeTariffRepository,
        private readonly tariffsBroadcaster: TariffsBroadcaster,
    ) {}

    public initializeListeners() {
        (this.tariffRepository as CrudRepository<OcppTariff>)
            .on('created', tariffs => this.tariffsBroadcaster.broadcast(tariffs))
            .on('updated', tariffs => this.tariffsBroadcaster.broadcast(tariffs))
            .on('deleted', tariffs => this.tariffsBroadcaster.broadcastDeletion(tariffs));
    }

}