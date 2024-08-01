import { Service } from 'typedi';
import { DeleteTariffParams } from '../trigger/param/tariffs/delete.tariff.params';
import { CredentialsService } from '../services/credentials.service';
import { ModuleId } from '../model/ModuleId';
import { PutTariffParams } from '../trigger/param/tariffs/put.tariff.params';
import { OcpiTariff, TariffKey } from '../model/OcpiTariff';
import { TariffDTO } from '../model/DTO/tariffs/TariffDTO';
import { TariffsService } from '../services/tariffs.service';
import { TariffsClientApi } from '../trigger/TariffsClientApi';
import { BaseBroadcaster } from './BaseBroadcaster';
import { ILogObj, Logger } from 'tslog';

@Service()
export class TariffsBroadcaster extends BaseBroadcaster {
  constructor(
    readonly logger: Logger<ILogObj>,
    readonly credentialsService: CredentialsService,
    private readonly tariffService: TariffsService,
    private readonly tariffsClientApi: TariffsClientApi,
  ) {
    super();
  }

  public async broadcastOcpiUpdate(ocpiTariffs: OcpiTariff[]) {
    (await this.tariffService.getTariffsForOcpiTariffs(ocpiTariffs)).forEach(
      (tariff) => this.broadcastTariff(tariff),
    );
  }

  public async broadcastByKey(key: TariffKey) {
    const tariff = await this.tariffService.getTariffByKey(key);
    if (tariff === undefined) {
      throw new Error(
        `Tariff ${key.countryCode}:${key.partyId}:${key.id} not found`,
      );
    }
    return this.broadcastTariff(tariff);
  }

  public async broadcastDeletionByKeys(keys: TariffKey[]) {
    keys.forEach((key) => this.broadcastDeletionByKey(key));
  }

  public async broadcastDeletionByKey(key: TariffKey) {
    const tariff = await this.tariffService.getTariffByKey(key);
    if (tariff !== undefined) {
      throw new Error(
        `Tariff ${key.countryCode}:${key.partyId}:${key.id} exists`,
      );
    }
    return this.broadcastTariffDeletion(key);
  }

  private async broadcastTariff(tariff: TariffDTO) {
    try {
      const params = PutTariffParams.build(tariff.id, tariff);
      await this.tariffsClientApi.broadcastToClients(
        tariff.country_code,
        tariff.party_id,
        ModuleId.Tariffs,
        params,
        this.tariffsClientApi.putTariff,
      );
    } catch (error) {
      console.log(`Failed to broadcast ${tariff.id} tariff`);
    }
  }

  private async broadcastTariffDeletion({
    id,
    countryCode,
    partyId,
  }: TariffKey): Promise<void> {
    try {
      const params = DeleteTariffParams.build(id);
      await this.tariffsClientApi.broadcastToClients(
        countryCode,
        partyId,
        ModuleId.Tariffs,
        params,
        this.tariffsClientApi.deleteTariff,
      );
    } catch (error) {
      console.error(`Failed to broadcast deletion of ${id} tariff`);
    }
  }
}
