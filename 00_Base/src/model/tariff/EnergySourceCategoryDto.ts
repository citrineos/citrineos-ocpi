import {EnergySourceCategory} from "@citrineos/data";

export const ALL_ENERGY_SOURCE_CATEGORIES = [
    'NUCLEAR',
    'GENERAL_FOSSIL',
    'COAL',
    'GAS',
    'GENERAL_GREEN',
    'SOLAR',
    'WIND',
    'WATER',
] as const;

export type EnergySourceCategoryDto = typeof ALL_ENERGY_SOURCE_CATEGORIES[number];

export function energySourceCategoryDto(category: EnergySourceCategory): EnergySourceCategoryDto {
    switch (category) {
        case 'NUCLEAR':
            return 'NUCLEAR';
        case 'GENERAL_FOSSIL':
            return 'GENERAL_FOSSIL';
        case 'COAL':
            return 'COAL';
        case 'GAS':
            return 'GAS';
        case 'GENERAL_GREEN':
            return 'GENERAL_GREEN';
        case 'SOLAR':
            return 'SOLAR';
        case 'WIND':
            return 'WIND';
        case 'WATER':
            return 'WATER';
        default:
            throw new Error(`Invalid energy source category: ${category}`);
    }
}
