import {Expose} from "class-transformer";
import {Price} from "@citrineos/data";

export class PriceDto {

    @Expose({name: 'excl_vat'})
    exclVat!: number;

    @Expose({name: 'incl_vat'})
    inclVat?: number;

    public constructor(exclVat: number, inclVat?: number) {
        this.exclVat = exclVat;
        this.inclVat = inclVat;
    }

    public static from(price: Price): PriceDto {
        return new PriceDto(price.exclVat, price.inclVat);
    }

}
