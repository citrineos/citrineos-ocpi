import {Expose} from "class-transformer";
import {PriceComponent} from "@citrineos/data";
import {tariffDimensionTypeDto, TariffDimensionTypeDto} from "./TariffDimensionTypeDto";

export class PriceComponentDto {

    @Expose({name: 'type'})
    type!: TariffDimensionTypeDto;

    @Expose({name: 'price'})
    price!: number;

    @Expose({name: 'vat'})
    vat?: number;

    @Expose({name: 'step_size'})
    stepSize!: number;

    public constructor(priceComponent: PriceComponentDto) {
        // noinspection TypeScriptValidateTypes
        Object.assign(this, priceComponent);
    }

    public static from(priceComponent: PriceComponent): PriceComponentDto {
        return new PriceComponent({
            type: tariffDimensionTypeDto(priceComponent.type),
            price: priceComponent.price,
            vat: priceComponent.vat,
            stepSize: priceComponent.stepSize
        });
    }
}
