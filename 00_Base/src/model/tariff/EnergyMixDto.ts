import {Expose} from 'class-transformer';
import {EnergyMix} from "@citrineos/data";
import {ShortName} from "@citrineos/base";
import {EnergySourcesDto} from "./EnergySourcesDto";
import {EnvironmentalImpactDto} from "./EnvironmentalImpactDto";

export class EnergyMixDto {

    @Expose({name: 'is_green_energy'})
    isGreenEnergy!: boolean;

    @Expose({name: 'energy_sources'})
    energySources?: EnergySourcesDto[];

    @Expose({name: 'environ_impact'})
    environImpact?: EnvironmentalImpactDto[];

    @Expose({name: 'supplier_name'})
    supplierName?: ShortName;

    @Expose({name: 'energy_product_name'})
    energyProductName?: ShortName;

    public constructor(energyMix: EnergyMixDto) {
        // noinspection TypeScriptValidateTypes
        Object.assign(this, energyMix);
    }

    public static from(energyMix: EnergyMix): EnergyMixDto {
        return new EnergyMixDto({
            isGreenEnergy: energyMix.isGreenEnergy,
            energySources: energyMix.energySources?.map(energySource => EnergySourcesDto.from(energySource)),
            environImpact: energyMix.environImpact?.map(impact => EnvironmentalImpactDto.from(impact)),
            supplierName: energyMix.supplierName,
            energyProductName: energyMix.energyProductName
        });
    }
}
