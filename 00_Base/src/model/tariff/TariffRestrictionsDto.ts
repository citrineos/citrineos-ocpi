import {Expose} from "class-transformer";
import {DayOfWeek, DurationInSeconds, HourMinute, YearMonthDay} from "@citrineos/base";
import {TariffRestrictions} from "@citrineos/data";
import {reservationRestrictionTypeDto, ReservationRestrictionTypeDto} from "./ReservationRestrictionTypeDto";

export class TariffRestrictionsDto {

    @Expose({name: 'start_time'})
    startTime?: HourMinute;

    @Expose({name: 'end_time'})
    endTime?: HourMinute;

    @Expose({name: 'start_date'})
    startDate?: YearMonthDay;

    @Expose({name: 'end_date'})
    endDate?: YearMonthDay;

    @Expose({name: 'min_kwh'})
    minKwh?: number;

    @Expose({name: 'max_kwh'})
    maxKwh?: number;

    @Expose({name: 'min_current'})
    minCurrent?: number;

    @Expose({name: 'max_current'})
    maxCurrent?: number;

    @Expose({name: 'min_power'})
    minPower?: number;

    @Expose({name: 'max_power'})
    maxPower?: number;

    @Expose({name: 'min_duration'})
    minDuration?: DurationInSeconds;

    @Expose({name: 'max_duration'})
    maxDuration?: DurationInSeconds;

    @Expose({name: 'day_of_week'})
    dayOfWeek?: DayOfWeek[];

    @Expose({name: 'reservation'})
    reservation?: ReservationRestrictionTypeDto;

    public constructor(restrictions: TariffRestrictionsDto) {
        // noinspection TypeScriptValidateTypes
        Object.assign(this, restrictions);
    }

    public static from(restrictions: TariffRestrictions): TariffRestrictionsDto {
        return new TariffRestrictionsDto({
            startTime: restrictions.startTime,
            endTime: restrictions.endTime,
            startDate: restrictions.startDate,
            endDate: restrictions.endDate,
            minKwh: restrictions.minKwh,
            maxKwh: restrictions.maxKwh,
            minCurrent: restrictions.minCurrent,
            maxCurrent: restrictions.maxCurrent,
            minPower: restrictions.minPower,
            maxPower: restrictions.maxPower,
            minDuration: restrictions.minDuration,
            maxDuration: restrictions.maxDuration,
            dayOfWeek: restrictions.dayOfWeek,
            ...(restrictions.reservation && { reservation: reservationRestrictionTypeDto(restrictions.reservation) }),
        });
    }

}
