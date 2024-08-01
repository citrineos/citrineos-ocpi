import { Service } from 'typedi';
import { SequelizeRepository } from '@citrineos/data';
import { OcpiServerConfig } from '../config/ocpi.server.config';
import { ILogObj, Logger } from 'tslog';
import { OcpiSequelizeInstance } from '../util/sequelize';
import { SystemConfig } from '@citrineos/base';
import { OcpiNamespace } from '../util/ocpi.namespace';
import { OcpiTariff, TariffKey } from '../model/OcpiTariff';
import { Op } from 'sequelize';
import { GetTariffsParams } from '../model/DTO/tariffs/GetTariffsParams';

@Service()
export class OcpiTariffRepository extends SequelizeRepository<OcpiTariff> {
  constructor(
    ocpiSystemConfig: OcpiServerConfig,
    logger: Logger<ILogObj>,
    ocpiSequelizeInstance: OcpiSequelizeInstance,
  ) {
    super(
      ocpiSystemConfig as SystemConfig,
      OcpiNamespace.OcpiTariff,
      logger,
      ocpiSequelizeInstance.sequelize,
    );
  }

  async findByTariffKey({
    id,
    countryCode,
    partyId,
  }: TariffKey): Promise<OcpiTariff | undefined> {
    return this.readOnlyOneByQuery({ where: { id, countryCode, partyId } });
  }

  async findByCoreTariffKey({
    id: coreTariffId,
    countryCode,
    partyId,
  }: TariffKey): Promise<OcpiTariff | undefined> {
    return this.readOnlyOneByQuery({
      where: { coreTariffId, countryCode, partyId },
    });
  }

  async getTariffs(
    params: GetTariffsParams,
  ): Promise<{ rows: OcpiTariff[]; count: number }> {
    return this.findAndCount({
      where: {
        ...this.lastUpdated(params.dateFrom, params.dateTo),
        ...(params.cpoCountryCode && { countryCode: params.cpoCountryCode }),
        ...(params.cpoPartyId && { partyId: params.cpoPartyId }),
      },
      offset: params.offset,
      limit: params.limit,
    });
  }

  async upsertTariff(tariff: OcpiTariff): Promise<OcpiTariff> {
    const existingTariff = await this.findByTariffKey(tariff.key);

    if (existingTariff) {
      const updatedTariff = await this._updateByKey(tariff, tariff.id);

      if (updatedTariff) {
        return updatedTariff;
      }

      throw new Error('Failed to update tariff with ID ' + tariff.id);
    } else {
      return this._create(tariff);
    }
  }

  private lastUpdated(from?: Date, to?: Date): any {
    if (!from && !to) {
      return {};
    }
    if (!from && to) {
      return { updatedAt: { [Op.lte]: to } };
    }
    if (from && !to) {
      return { updatedAt: { [Op.gte]: from } };
    }
    return { updatedAt: { [Op.between]: [from, to] } };
  }
}
