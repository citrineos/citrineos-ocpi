import {Service} from 'typedi';
import {SequelizeTariffRepository, Tariff} from "@citrineos/data";
import {ClientInformationRepository} from "@citrineos/ocpi-base/src/repository/ClientInformationRepository";
import {v4 as uuid} from 'uuid';
import {DeleteTariffParams} from "../trigger/param/tariffs/delete.tariff.params";
import {VersionNumber} from "../model/VersionNumber";
import {CredentialsService} from "./credentials.service";
import {ModuleId} from "../model/ModuleId";
import {ClientInformation, ClientInformationProps} from "../model/ClientInformation";
import {PutTariffParams} from "../trigger/param/tariffs/put.tariff.params";
import {OcpiTariff, TariffKey} from "../model/OcpiTariff";
import {TariffDTO} from "../model/DTO/TariffDTO";
import {TariffsService} from "./tariffs.service";
import {OcpiTariffRepository} from "../repository/OcpiTariffRepository";
import {TariffsClientApi} from "../trigger/TariffsClientApi";

@Service()
export class TariffsBroadcaster {

    constructor(
        private readonly tariffRepository: SequelizeTariffRepository,
        private readonly ocpiTariffRepository: OcpiTariffRepository,
        private readonly tariffService: TariffsService,
        private readonly clientInformationRepository: ClientInformationRepository,
        private readonly tariffsClientApi: TariffsClientApi,
        private readonly credentialsService: CredentialsService,
    ) {
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
            const receivers = await this.getReceivers(tariff.country_code, tariff.party_id);

            receivers.forEach(({token, countryCode, partyId, url, version}) => {
                // TODO: how to pass/ set URL?
                const params = new PutTariffParams({
                    tariffId: tariff.id,
                    tariff: tariff,
                    fromCountryCode: tariff.country_code,
                    fromPartyId: tariff.party_id,
                    toCountryCode: countryCode,
                    toPartyId: partyId,
                    authorization: `Token ${token}`,
                    xRequestId: uuid().toString(),
                    xCorrelationId: uuid().toString(),
                    version: version
                });
                this.tariffsClientApi.putTariff(params);
            });
        } catch (error) {
            console.log(`Failed to broadcast ${tariff.id} tariff`);
        }
    }

    private async broadcastTariffDeletion({id, countryCode, partyId}: TariffKey): Promise<void> {
        try {
            const receivers = await this.getReceivers(countryCode, partyId);

            receivers.forEach(({token, countryCode, partyId, url, version}) => {
                // TODO: how to pass/ set URL?
                const params = new DeleteTariffParams({
                    tariffId: id,
                    fromCountryCode: countryCode,
                    fromPartyId: partyId,
                    toCountryCode: countryCode,
                    toPartyId: partyId,
                    authorization: `Token ${token}`,
                    xRequestId: uuid().toString(),
                    xCorrelationId: uuid().toString(),
                    version: version
                });
                this.tariffsClientApi.deleteTariff(params);
            });
        } catch (error) {
            console.error(`Failed to broadcast deletion of ${id} tariff`);
        }
    }

    async getReceivers(tenantCountryCode: string, tenantPartyId: string): Promise<{
        token: string,
        countryCode: string,
        partyId: string,
        version: VersionNumber,
        url: string
    }[]> {
        const tenant = await this.credentialsService.getCpoTenantByServerCountryCodeAndPartyId(tenantCountryCode, tenantPartyId);

        const receiverInformation = tenant.clientInformation.flatMap(this.extractReceiverInformation);
        const receiverParties = tenant.clientInformation.flatMap(this.extractReceiverParties);

        return receiverParties.flatMap(({ countryCode, partyId }) =>
            receiverInformation.map(({ token, url, version }) => ({ token, countryCode, partyId, url, version }))
        );
    }

    private extractReceiverInformation(clientInformation: ClientInformation): {
        token: string,
        url: string,
        version: VersionNumber
    }[] {
        const token = clientInformation[ClientInformationProps.clientToken];
        return clientInformation.getReceiversOf(ModuleId.Tariffs)
            .flatMap(({endpoints, version}) =>
                endpoints.map(endpoint => ({token, url: endpoint.url, version}))
            );
    }

    private extractReceiverParties(clientInformation: ClientInformation): { countryCode: string, partyId: string }[] {
        return clientInformation.clientCredentialsRoles
            .filter(role => role.isMsp())
            .map(role => ({countryCode: role.country_code, partyId: role.party_id}));
    }

}