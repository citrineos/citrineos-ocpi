import {TariffType} from "@citrineos/data";

export const ALL_TARIFF_TYPES = [
    'AD_HOC_PAYMENT',
    'PROFILE_CHEAP',
    'PROFILE_FAST',
    'PROFILE_GREEN',
    'REGULAR'
] as const;

export type TariffTypeDto = typeof ALL_TARIFF_TYPES[number];

export function tariffTypeDto(type: TariffType): TariffTypeDto {
    switch (type) {
        case 'AD_HOC_PAYMENT':
            return 'AD_HOC_PAYMENT';
        case 'PROFILE_CHEAP':
            return 'PROFILE_CHEAP';
        case 'PROFILE_FAST':
            return 'PROFILE_FAST';
        case 'PROFILE_GREEN':
            return 'PROFILE_GREEN';
        case 'REGULAR':
            return 'REGULAR';
        default:
            throw new Error(`Invalid tariff type: ${type}`);
    }
}
