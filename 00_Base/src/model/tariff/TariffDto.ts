import {IsArray, IsNotEmpty, ValidateNested,} from 'class-validator';
import {Expose, instanceToPlain, Type} from 'class-transformer';
import {PaginatedResponse} from '../PaginatedResponse';
import {CountryCode, Currency, Displaytext, PartyId, TariffId, Url} from "@citrineos/base";
import {TariffTypeDto, tariffTypeDto} from "./TariffTypeDto";
import {DisplayTextDto} from "./DisplayTextDto";
import {PriceDto} from "./PriceDto";
import {Optional} from "../../util/decorators/optional";
import {Tariff} from "@citrineos/data";
import {EnergyMixDto} from "./EnergyMixDto";
import {TariffElementDto} from "./TariffElementDto";

export class TariffDto {

    @Expose({name: 'id'})
    id!: TariffId;

    @Expose({name: 'country_code'})
    countryCode!: CountryCode;

    @Expose({name: 'party_id'})
    partyId!: PartyId;

    @Expose({name: 'currency'})
    currency!: Currency;

    @Expose({name: 'type'})
    type?: TariffTypeDto;

    @Expose({name: 'tariff_alt_text'})
    tariffAltText?: DisplayTextDto[];

    @Expose({name: 'tariff_alt_url'})
    tariffAltUrl?: Url;

    @Expose({name: 'min_price'})
    minPrice?: PriceDto;

    @Expose({name: 'max_price'})
    maxPrice?: PriceDto;

    @Expose({name: 'elements'})
    elements!: TariffElementDto[];

    @Expose({name: 'energy_mix'})
    energyMix?: EnergyMixDto;

    @Expose({name: 'start_date_time'})
    startDateTime?: Date;

    @Expose({name: 'end_date_time'})
    endDateTime?: Date;

    @Expose({name: 'last_updated'})
    lastUpdated!: Date;

    public constructor(tariff: TariffDto) {
        // noinspection TypeScriptValidateTypes
        Object.assign(this, tariff);
    }

    public static from(tariff: Tariff): TariffDto {
        return new TariffDto({
            id: tariff.id,
            countryCode: tariff.countryCode,
            partyId: tariff.partyId,
            currency: tariff.currency,
            ...(tariff.type && {type: tariffTypeDto(tariff.type)}),
            tariffAltText: tariff.tariffAltText?.map((text: Displaytext) => DisplayTextDto.from(text)),
            tariffAltUrl: tariff.tariffAltUrl,
            ...(tariff.minPrice && {minPrice: PriceDto.from(tariff.minPrice)}),
            ...(tariff.maxPrice && {maxPrice: PriceDto.from(tariff.maxPrice)}),
            elements: tariff.elements.map(element => TariffElementDto.from(element)),
            ...(tariff.energyMix && {energyMix: EnergyMixDto.from(tariff.energyMix)}),
            startDateTime: tariff.startDateTime,
            endDateTime: tariff.endDateTime,
            lastUpdated: tariff.lastUpdated,
        } as TariffDto);
    }

    public toJson(): Record<string, any> {
        return instanceToPlain(this);
    }
}

export class PaginatedTariffResponse extends PaginatedResponse<TariffDto> {
    @IsArray()
    @ValidateNested({each: true})
    @IsNotEmpty()
    @Optional(false)
    @Type(() => TariffDto)
    data!: TariffDto[];
}
