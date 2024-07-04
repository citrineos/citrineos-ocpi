import {Service} from 'typedi';
import {SequelizeTariffRepository} from "@citrineos/data";
import {ClientInformationRepository} from "@citrineos/ocpi-base/src/repository/ClientInformationRepository";
import {DeleteTariffParams} from "../trigger/param/tariffs/delete.tariff.params";
import {CredentialsService} from "./credentials.service";
import {ModuleId} from "../model/ModuleId";
import {PutTariffParams} from "../trigger/param/tariffs/put.tariff.params";
import {OcpiTariff, TariffKey} from "../model/OcpiTariff";
import {TariffDTO} from "../model/DTO/TariffDTO";
import {TariffsService} from "./tariffs.service";
import {OcpiTariffRepository} from "../repository/OcpiTariffRepository";
import {TariffsClientApi} from "../trigger/TariffsClientApi";
import {BaseBroadcaster} from "../broadcaster/BaseBroadcaster";
import {ILogObj, Logger} from "tslog";

@Service()
export class TariffsBroadcaster extends BaseBroadcaster {

    constructor(
        readonly logger: Logger<ILogObj>,
        readonly credentialsService: CredentialsService,
        private readonly tariffRepository: SequelizeTariffRepository,
        private readonly ocpiTariffRepository: OcpiTariffRepository,
        private readonly tariffService: TariffsService,
        private readonly clientInformationRepository: ClientInformationRepository,
        private readonly tariffsClientApi: TariffsClientApi,
    ) {
        super(logger, credentialsService);
    }

    public async broadcastOcpiUpdate(tariffs: OcpiTariff[]) {
        (await this.tariffService.extendOcpiTariffs(tariffs)).forEach(tariff => this.broadcastTariff(tariff));
    }

    public async broadcastByKey(key: TariffKey) {
        const tariff = await this.tariffService.getTariffByKey(key);
        if (tariff === undefined) {
            throw new Error(`Tariff ${key.countryCode}:${key.partyId}:${key.id} not found`);
        }
        return this.broadcastTariff(tariff);
    }

    public async broadcastDeletionByKeys(keys: TariffKey[]) {
        keys.forEach(key=> this.broadcastDeletionByKey(key));
    }

    public async broadcastDeletionByKey(key: TariffKey) {
        const tariff = await this.tariffService.getTariffByKey(key);
        if (tariff !== undefined) {
            throw new Error(`Tariff ${key.countryCode}:${key.partyId}:${key.id} exists`);
        }
        return this.broadcastTariffDeletion(key);
    }

    private async broadcastTariff(tariff: TariffDTO) {
        try {
            const params = PutTariffParams.build(tariff.id, tariff);
            await this.broadcastToClients(
                tariff.country_code,
                tariff.party_id,
                ModuleId.Tariffs,
                params,
                this.tariffsClientApi,
                this.tariffsClientApi.putTariff
            );
        } catch (error) {
            console.log(`Failed to broadcast ${tariff.id} tariff`);
        }
    }

    private async broadcastTariffDeletion({id, countryCode, partyId}: TariffKey): Promise<void> {
        try {
            const params = DeleteTariffParams.build(id);
            await this.broadcastToClients(
                countryCode,
                partyId,
                ModuleId.Tariffs,
                params,
                this.tariffsClientApi,
                this.tariffsClientApi.deleteTariff
            );
        } catch (error) {
            console.error(`Failed to broadcast deletion of ${id} tariff`);
        }
    }

}