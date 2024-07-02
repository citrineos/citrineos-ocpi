import {EnvironmentalImpactCategory} from "@citrineos/data";

export const ALL_ENVIRONMENTAL_IMPACT_CATEGORIES = [
    'NUCLEAR_WASTE',
    'CARBON_DIOXIDE',
] as const;

export type EnvironmentalImpactCategoryDto = typeof ALL_ENVIRONMENTAL_IMPACT_CATEGORIES[number];

export function environmentalImpactCategoryDto(category: EnvironmentalImpactCategory): EnvironmentalImpactCategoryDto {
    switch (category) {
        case "NUCLEAR_WASTE":
            return "NUCLEAR_WASTE";
        case "CARBON_DIOXIDE":
            return 'CARBON_DIOXIDE';
        default:
            throw new Error(`Invalid environmental impact category: ${category}`);
    }
}
