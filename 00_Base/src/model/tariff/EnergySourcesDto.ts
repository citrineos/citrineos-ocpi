import {EnergySources} from "@citrineos/data";
import {Percentage} from "@citrineos/base";
import {Expose} from "class-transformer";
import {energySourceCategoryDto, EnergySourceCategoryDto} from "./EnergySourceCategoryDto";

export class EnergySourcesDto {

    @Expose({name: 'source'})
    source!: EnergySourceCategoryDto;

    @Expose({name: 'percentage'})
    percentage!: Percentage;

    public constructor(source: EnergySourceCategoryDto, percentage: Percentage) {
        this.source = source;
        this.percentage = percentage;
    }

    public static from(energySources: EnergySources): EnergySourcesDto {
        return new EnergySourcesDto(
            energySourceCategoryDto(energySources.source),
            energySources.percentage
        );
    }

}
