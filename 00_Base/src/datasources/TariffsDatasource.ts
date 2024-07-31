import { Service } from 'typedi';
import { OcpiTariffRepository } from '../repository/OcpiTariffRepository';
import { OcpiTariff, TariffKey } from '../model/OcpiTariff';
import { SequelizeTariffRepository, Tariff } from '@citrineos/data';
import { TariffMapper } from '../mapper/tariff.mapper';
import { TariffDTO } from '../model/DTO/tariffs/TariffDTO';
import { Op } from 'sequelize';
import { ILogObj, Logger } from 'tslog';
import { PutTariffRequest } from '../model/DTO/tariffs/PutTariffRequest';
import { OcpiSequelizeInstance } from '../util/sequelize';
import { GetTariffsParams } from '../model/DTO/tariffs/GetTariffsParams';
import { ITariffsDatasource } from './ITariffsDatasource';

@Service()
export class TariffsDatasource implements ITariffsDatasource {
  constructor(
    private ocpiTariffRepository: OcpiTariffRepository,
    private coreTariffRepository: SequelizeTariffRepository,
    private tariffMapper: TariffMapper,
    private ocpiSequelizeInstance: OcpiSequelizeInstance,
    private readonly logger: Logger<ILogObj>,
  ) {}

  async getTariffByKey(
    key: TariffKey,
    isCoreTariffKey: boolean = false,
  ): Promise<TariffDTO | undefined> {
    try {
      const ocpiTariff = isCoreTariffKey
        ? await this.ocpiTariffRepository.findByCoreTariffKey(key)
        : await this.ocpiTariffRepository.findByTariffKey(key);

      if (!ocpiTariff) {
        return undefined;
      }

      const coreTariff = await this.coreTariffRepository.readByKey(
        ocpiTariff.coreTariffId,
      );
      if (!coreTariff) {
        throw new Error(
          `Core tariff for OCPI tariff ${ocpiTariff.id} not found`,
        );
      }

      return this.tariffMapper.map(coreTariff, ocpiTariff);
    } catch (error) {
      this.logger.error(`Error in getTariffByKey: ${error}`, {
        key,
        isCoreTariffKey,
      });
      throw error;
    }
  }

  async getTariffs(
    params: GetTariffsParams,
  ): Promise<{ data: TariffDTO[]; count: number }> {
    try {
      const { rows: ocpiTariffs, count: ocpiTariffsCount } =
        await this.ocpiTariffRepository.getTariffs(params);

      if (ocpiTariffsCount === 0) return { data: [], count: 0 };

      const tariffs = await this.getTariffsForOcpiTariffs(ocpiTariffs);
      return { data: tariffs, count: ocpiTariffsCount };
    } catch (error) {
      this.logger.error(`Error in getTariffs: ${error}`, { params });
      throw error;
    }
  }

  async getTariffsForOcpiTariffs(ocpiTariffs: OcpiTariff[]) {
    try {
      const coreTariffIdToOcpiTariffMap = new Map(
        ocpiTariffs.map((tariff) => [tariff.coreTariffId, tariff]),
      );

      const coreTariffs = await this.coreTariffRepository.readAllByQuery({
        where: {
          id: { [Op.in]: Array.from(coreTariffIdToOcpiTariffMap.keys()) },
        },
        order: [['createdAt', 'ASC']],
      });

      return coreTariffs.map((coreTariff) =>
        this.tariffMapper.map(
          coreTariff,
          coreTariffIdToOcpiTariffMap.get(coreTariff.id)!,
        ),
      );
    } catch (error) {
      this.logger.error(`Error in getTariffsForOcpiTariffs: ${error}`);
      throw error;
    }
  }

  async saveTariff(tariffRequest: PutTariffRequest): Promise<TariffDTO> {
    try {
      const [ocpiTariff, coreTariff] =
        this.tariffMapper.mapPutTariffRequestToEntities(tariffRequest);

      const [newCoreTariff, newOcpiTariff] =
        await this.ocpiSequelizeInstance.sequelize.transaction(async (t) => {
          const [savedCoreTariff] = await Tariff.upsert(coreTariff.toJSON(), {
            transaction: t,
          });

          ocpiTariff.coreTariffId = savedCoreTariff.id;
          const [savedOcpiTariff] = await OcpiTariff.upsert(
            ocpiTariff.toJSON(),
            { transaction: t },
          );

          return [savedCoreTariff, savedOcpiTariff];
        });

      return this.tariffMapper.map(newCoreTariff, newOcpiTariff);
    } catch (error) {
      this.logger.error(`Error in saveTariff: ${error}`, { tariffRequest });
      throw error;
    }
  }

  async deleteTariffByTariffId(tariffId: number): Promise<void> {
    try {
      const savedOcpiTariff =
        await this.ocpiTariffRepository.readByKey(tariffId);
      if (!savedOcpiTariff) return;

      await this.ocpiSequelizeInstance.sequelize.transaction(async (t) => {
        if (savedOcpiTariff.coreTariffId) {
          await Tariff.destroy({
            where: { id: savedOcpiTariff.coreTariffId },
            transaction: t,
          });
        }
        await savedOcpiTariff.destroy({ transaction: t });
      });
    } catch (error) {
      this.logger.error(`Error in deleteTariffByTariffId: ${error}`, {
        tariffId,
      });
      throw error;
    }
  }
}
