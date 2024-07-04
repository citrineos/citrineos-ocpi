import {Service} from "typedi";
import {PaginatedParams} from "@citrineos/ocpi-base/src/controllers/param/paginated.params";
import {SequelizeTariffRepository} from "@citrineos/data";
import {Op} from 'sequelize';
import {TariffDTO} from "../model/DTO/TariffDTO";
import {OcpiTariffRepository} from "../repository/OcpiTariffRepository";
import {DEFAULT_LIMIT, DEFAULT_OFFSET} from "../model/PaginatedResponse";
import {OcpiTariff, TariffKey} from "../model/OcpiTariff";
import {TariffMapper} from "./tariff.mapper";
import {OcpiHeaders} from "../model/OcpiHeaders";

@Service()
export class TariffsService {

    constructor(
        private readonly ocpiTariffRepository: OcpiTariffRepository,
        private readonly coreTariffRepository: SequelizeTariffRepository,
        private readonly tariffMapper: TariffMapper
    ) {
    }

    async getTariffByKey(key: TariffKey): Promise<TariffDTO | undefined> {
        const ocpiTariff = await this.ocpiTariffRepository.findByTariffKey(key);
        if (ocpiTariff === undefined) {
            return undefined;
        }
        return this.extendOcpiTariff(ocpiTariff);
    }

    public async extendOcpiTariff(ocpiTariff: OcpiTariff): Promise<TariffDTO> {
        const coreTariff = await this.coreTariffRepository.readByKey(ocpiTariff.coreTariffId);
        if (coreTariff === undefined) {
            throw new Error(`Tariff ${ocpiTariff.id} not found`);
        }
        return this.tariffMapper.map(coreTariff, ocpiTariff);
    }

    public async extendOcpiTariffs(ocpiTariffs: OcpiTariff[]): Promise<TariffDTO[]> {
        const coreTariffIdToOcpiTariff = ocpiTariffs.reduce((acc: any, obj) => {
            acc[obj.coreTariffId] = obj;
            return acc;
        }, {});
        const coreTariffs = await this.coreTariffRepository.readAllByQuery({
            where: {id: {[Op.in]: Object.keys(coreTariffIdToOcpiTariff)}}
        });

        return coreTariffs.map((ocppTariff) => this.tariffMapper.map(ocppTariff, coreTariffIdToOcpiTariff[ocppTariff.id]));
    }

    async getTariffs(
        ocpiHeaders: OcpiHeaders,
        paginationParams?: PaginatedParams,
    ): Promise<{ data: TariffDTO[]; count: number }> {
        const limit = paginationParams?.limit ?? DEFAULT_LIMIT;
        const offset = paginationParams?.offset ?? DEFAULT_OFFSET;

        const {rows, count} = await this.ocpiTariffRepository.getTariffs(
            limit, offset,
            paginationParams?.date_from, paginationParams?.date_to,
            ocpiHeaders.toCountryCode, ocpiHeaders.toPartyId
        );

        if (count === 0) {
            return {data: [], count: 0};
        }
        return {data: await this.extendOcpiTariffs(rows), count};
    }

}