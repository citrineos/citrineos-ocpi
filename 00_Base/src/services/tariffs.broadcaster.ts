import {Service} from 'typedi';
import {TariffsClientApi} from "@citrineos/ocpi-base/src/trigger/TariffsClientApi";
import {SequelizeTariffRepository, Tariff} from "@citrineos/data";
import {ClientInformationRepository} from "@citrineos/ocpi-base/src/repository/ClientInformationRepository";
import {v4 as uuid} from 'uuid';
import {DeleteTariffParams} from "../trigger/param/tariffs/delete.tariff.params";
import {VersionNumber} from "../model/VersionNumber";
import {CredentialsService} from "./credentials.service";
import {ModuleId} from "../model/ModuleId";
import {ClientInformation, ClientInformationProps} from "../model/ClientInformation";
import {PutTariffParams} from "../trigger/param/tariffs/put.tariff.params";
import {CountryCode, PartyId, TariffKey} from '@citrineos/base';

@Service()
export class TariffsBroadcaster {

    constructor(
        private readonly tariffRepository: SequelizeTariffRepository,
        private readonly clientInformationRepository: ClientInformationRepository,
        private readonly tariffsClientApi: TariffsClientApi,
        private readonly credentialsService: CredentialsService,
    ) {
    }

    public async broadcast(tariffs: Tariff[]) {
        tariffs.forEach(tariff => this.broadcastTariff(tariff));
    }

    public async broadcastByKey(key: TariffKey) {
        const tariff = await this.tariffRepository.findByKey(key);
        if (tariff === undefined) {
            throw new Error(`Tariff ${key.countryCode}:${key.partyId}:${key.id} not found`);
        }
        return this.broadcastTariff(tariff);
    }

    public async broadcastDeletion(tariffs: Tariff[]) {
        tariffs.forEach(tariff => this.broadcastTariffDeletion(tariff.key));
    }

    public async broadcastDeletionByKey(key: TariffKey) {
        const tariff = await this.tariffRepository.findByKey(key);
        if (tariff !== undefined) {
            throw new Error(`Tariff ${key.countryCode}:${key.partyId}:${key.id} exists`);
        }
        return this.broadcastTariffDeletion(key);
    }

    private async broadcastTariff(tariff: Tariff) {
        console.log(`Broadcasting of ${tariff.id} tariff`);
        const receivers = await this.getReceivers(tariff.countryCode, tariff.partyId);

        receivers.forEach(({token, countryCode, partyId, url, version}) => {
            // TODO: how to pass/ set URL?
            const params = new PutTariffParams({
                tariffId: tariff.id,
                tariff: tariff,
                fromCountryCode: tariff.countryCode,
                fromPartyId: tariff.partyId,
                toCountryCode: countryCode,
                toPartyId: partyId,
                authorization: `Token ${token}`,
                xRequestId: uuid().toString(),
                xCorrelationId: uuid().toString(),
                version: version
            });

            console.error(`Publishing ${tariff.id} tariff to ${countryCode}:${partyId}`);
            this.tariffsClientApi.putTariff(params);
        });
    }

    private async broadcastTariffDeletion({id, countryCode, partyId}: TariffKey): Promise<void> {
        console.log(`Broadcasting deletion of ${countryCode}:${partyId}:${id} tariff`);
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

            console.error(`Publishing deletion of ${id} tariff to ${countryCode}:${partyId}`);
            this.tariffsClientApi.deleteTariff(params);
        });
    }

    async getReceivers(tenantCountryCode: CountryCode, tenantPartyId: PartyId): Promise<{
        token: string,
        countryCode: string,
        partyId: string,
        version: VersionNumber,
        url: string
    }[]> {
        // TODO: confirm logic
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