import {TariffDimensionType} from "@citrineos/data";

export const ALL_TARIFF_DIMENSION_TYPES = [
    'ENERGY',
    'FLAT',
    'PARKING_TIME',
    'TIME',
] as const;

export type TariffDimensionTypeDto = typeof ALL_TARIFF_DIMENSION_TYPES[number];

export function tariffDimensionTypeDto(type: TariffDimensionType): TariffDimensionTypeDto {
    switch (type) {
        case "ENERGY":
            return "ENERGY";
        case "FLAT":
            return "FLAT";
        case "PARKING_TIME":
            return "PARKING_TIME";
        case "TIME":
            return "TIME";
        default:
            throw new Error(`Invalid tariff dimension type: ${type}`);
    }
}
