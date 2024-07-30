import { TariffDTO } from '../model/DTO/tariffs/TariffDTO';
import { OcpiTariff, TariffKey } from '../model/OcpiTariff';
import { GetTariffsParams } from '../model/DTO/tariffs/GetTariffsParams';
import { PutTariffRequest } from '../model/DTO/tariffs/PutTariffRequest';

export interface ITariffsDatasource {
  getTariffByKey(key: TariffKey, isCoreTariffKey?: boolean): Promise<TariffDTO | undefined>;

  getTariffs(params: GetTariffsParams): Promise<{ data: TariffDTO[]; count: number }>;

  getTariffsForOcpiTariffs(ocpiTariffs: OcpiTariff[]): Promise<TariffDTO[]>;

  saveTariff(tariffRequest: PutTariffRequest): Promise<TariffDTO>;

  deleteTariffByTariffId(tariffId: number): Promise<void>;
}