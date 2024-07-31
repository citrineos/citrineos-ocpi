import { TariffKey } from '../model/OcpiTariff';
import { TariffDTO } from '../model/DTO/tariffs/TariffDTO';

export interface ICitrineTariffsDatasource {
  getTariffByCoreKey(key: TariffKey): Promise<TariffDTO | undefined>;
}
