import {Expose} from 'class-transformer';
import {TariffElement} from "@citrineos/data";
import {PriceComponentDto} from "./PriceComponentDto";
import {TariffRestrictionsDto} from "./TariffRestrictionsDto";

export class TariffElementDto {

    @Expose({name: 'price_components'})
    priceComponents!: PriceComponentDto[];

    @Expose({name: 'restrictions'})
    restrictions?: TariffRestrictionsDto;

    public constructor(tariffElement: TariffElementDto) {
        // noinspection TypeScriptValidateTypes
        Object.assign(this, tariffElement);
    }

    public static from(tariffElement: TariffElement): TariffElementDto {
        return new TariffElementDto({
            priceComponents: tariffElement.priceComponents.map(PriceComponentDto.from),
            ...(tariffElement.restrictions && {restrictions: TariffRestrictionsDto.from(tariffElement.restrictions)}),
        });
    }
}
