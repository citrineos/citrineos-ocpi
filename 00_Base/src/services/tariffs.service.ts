import { Inject, Service } from 'typedi';
import { TariffDTO } from '../model/DTO/tariffs/TariffDTO';
import { DEFAULT_LIMIT, DEFAULT_OFFSET } from '../model/PaginatedResponse';
import { OcpiTariff, TariffKey } from '../model/OcpiTariff';
import { OcpiHeaders } from '../model/OcpiHeaders';
import { PaginatedParams } from '../controllers/param/paginated.params';
import { PutTariffRequest } from '../model/DTO/tariffs/PutTariffRequest';
import { TariffsDatasource } from '../datasources/TariffsDatasource';
import { buildGetTariffsParams } from '../model/DTO/tariffs/GetTariffsParams';
import { ITariffsDatasource } from '../datasources/ITariffsDatasource';

@Service()
export class TariffsService {
  constructor(
    @Inject(() => TariffsDatasource) private readonly tariffsDatasource: ITariffsDatasource
  ) {
  }

  async getTariffByKey(key: TariffKey): Promise<TariffDTO | undefined> {
    return this.tariffsDatasource.getTariffByKey(key);
  }

  async getTariffByCoreKey(coreKey: TariffKey): Promise<TariffDTO | undefined> {
    return this.tariffsDatasource.getTariffByKey(coreKey, true);
  }

  async getTariffsForOcpiTariffs(ocpiTariffs: OcpiTariff[]) {
    return this.tariffsDatasource.getTariffsForOcpiTariffs(ocpiTariffs);
  }

  async getTariffs(
    ocpiHeaders: OcpiHeaders,
    paginationParams?: PaginatedParams,
  ): Promise<{ data: TariffDTO[]; count: number }> {
    const limit = paginationParams?.limit ?? DEFAULT_LIMIT;
    const offset = paginationParams?.offset ?? DEFAULT_OFFSET;

    return await this.tariffsDatasource.getTariffs(
      buildGetTariffsParams(
        limit,
        offset,
        paginationParams?.dateFrom,
        paginationParams?.dateTo,
        ocpiHeaders.toCountryCode,
        ocpiHeaders.toPartyId
      )
    );
  }

  async createOrUpdateTariff(
    tariffRequest: PutTariffRequest,
  ): Promise<TariffDTO> {
    return await this.tariffsDatasource.saveTariff(tariffRequest);
  }

  async deleteTariff(tariffId: number): Promise<void> {
    await this.tariffsDatasource.deleteTariffByTariffId(tariffId);
  }
}
