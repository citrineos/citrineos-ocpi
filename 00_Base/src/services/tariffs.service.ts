import {Service} from "typedi";
import {PaginatedParams} from "@citrineos/ocpi-base";
import {SequelizeTariffRepository, Tariff, TariffElement} from "@citrineos/data";
import {Op} from 'sequelize';

@Service()
export class TariffsService {

    constructor(
        private readonly tariffRepository: SequelizeTariffRepository,
    ) {
    }

    async getTariffs(paginationParams?: PaginatedParams,): Promise<{ rows: Tariff[]; count: number }> {
        return this.tariffRepository.findAndCount({
            where: {
                ...this.lastUpdated(paginationParams?.date_from, paginationParams?.date_to),
            },
            offset: paginationParams?.offset,
            limit: paginationParams?.limit,
            include: TariffElement,
        });
    }

    private lastUpdated(from?: Date, to?: Date): any {
        if (!from && !to) {
            return {};
        }
        if (!from && to) {
            return {lastUpdated: {[Op.lte]: to}};
        }
        if (from && !to) {
            return {lastUpdated: {[Op.gte]: from}};
        }
        return {lastUpdated: {[Op.between]: [from, to]}};
    }

}
