import { Service } from 'typedi';
import { Tariff } from '@citrineos/data';
import { TariffDTO } from '../model/DTO/tariffs/TariffDTO';
import { TariffDimensionType } from '../model/TariffDimensionType';
import { TariffElement } from '../model/TariffElement';
import { TariffType } from '../model/TariffType';
import { MINUTES_IN_HOUR } from '../util/Consts';
import { ITariffDto, ITenantDto } from '@citrineos/base';

@Service()
export class TariffMapper {
  constructor() {}

  public map(coreTariff: ITariffDto, tenant: ITenantDto): TariffDTO {
    return {
      id: coreTariff.id!.toString(),
      country_code: tenant.countryCode!,
      party_id: tenant.partyId!,
      currency: coreTariff.currency,
      type: TariffType.AD_HOC_PAYMENT,
      tariff_alt_text: coreTariff.tariffAltText
        ? (coreTariff.tariffAltText[0] as any)?.text
        : undefined,
      tariff_alt_url: undefined,
      min_price: undefined,
      max_price: undefined,
      elements: [this.getTariffElement(coreTariff)],
      energy_mix: undefined,
      start_date_time: undefined,
      end_date_time: undefined,
      last_updated: coreTariff.updatedAt!,
    };
  }
  private getTariffElement(coreTariff: ITariffDto): TariffElement {
    return {
      price_components: [
        {
          type: TariffDimensionType.ENERGY,
          price: coreTariff.pricePerKwh,
          vat: coreTariff.taxRate,
          step_size: 1,
        },
        ...(coreTariff.pricePerMin
          ? [
              {
                type: TariffDimensionType.TIME,
                price: coreTariff.pricePerMin * MINUTES_IN_HOUR,
                vat: coreTariff.taxRate,
                step_size: 1,
              },
            ]
          : []),
        ...(coreTariff.pricePerSession
          ? [
              {
                type: TariffDimensionType.FLAT,
                price: coreTariff.pricePerSession,
                vat: coreTariff.taxRate,
                step_size: 1,
              },
            ]
          : []),
      ],
      restrictions: undefined,
    };
  }

  // TODO make flexible for more complicated tariffs
  private mapTariffElementToCoreTariff(
    tariffElements: TariffElement[],
  ): Partial<Tariff> {
    const tariffElement = tariffElements[0];
    const priceComponents = tariffElement.price_components ?? [];
    const pricePerKwh =
      priceComponents.find((pc) => pc.type === TariffDimensionType.ENERGY)
        ?.price ?? 0;
    const pricePerMin =
      (priceComponents.find((pc) => pc.type === TariffDimensionType.TIME)
        ?.price ?? 0) / MINUTES_IN_HOUR;
    const pricePerSession =
      priceComponents.find((pc) => pc.type === TariffDimensionType.FLAT)
        ?.price ?? 0;
    const taxRate = priceComponents.find((pc) => pc.vat)?.vat ?? 0;

    return {
      pricePerKwh,
      pricePerMin,
      pricePerSession,
      taxRate,
    };
  }
}
