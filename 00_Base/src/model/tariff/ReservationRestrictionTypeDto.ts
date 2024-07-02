import {ReservationRestrictionType} from "@citrineos/data";

export const ALL_ENVIRONMENTAL_IMPACT_CATEGORIES = [
    'RESERVATION',
    'RESERVATION_EXPIRES',
] as const;

export type ReservationRestrictionTypeDto = typeof ALL_ENVIRONMENTAL_IMPACT_CATEGORIES[number];

export function reservationRestrictionTypeDto(type: ReservationRestrictionType): ReservationRestrictionTypeDto {
    switch (type) {
        case "RESERVATION":
            return "RESERVATION";
        case "RESERVATION_EXPIRES":
            return "RESERVATION_EXPIRES";
        default:
            throw new Error(`Invalid reservation restriction type: ${type}`);
    }
}
