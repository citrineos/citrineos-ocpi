import {EnvironmentalImpact} from "@citrineos/data";
import {environmentalImpactCategoryDto, EnvironmentalImpactCategoryDto} from "./EnvironmentalImpactCategoryDto";
import {Expose} from "class-transformer";

export class EnvironmentalImpactDto {

    @Expose({name: 'category'})
    category!: EnvironmentalImpactCategoryDto;

    @Expose({name: 'amount'})
    amount!: number;

    public constructor(category: EnvironmentalImpactCategoryDto, amount: number) {
        this.category = category;
        this.amount = amount;
    }

    public static from(environmentalImpact: EnvironmentalImpact): EnvironmentalImpactDto {
        return new EnvironmentalImpactDto(
            environmentalImpactCategoryDto(environmentalImpact.category),
            environmentalImpact.amount
        );
    }
}
