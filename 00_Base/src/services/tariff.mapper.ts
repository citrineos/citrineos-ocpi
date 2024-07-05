import { Service } from 'typedi';
import { Tariff } from '@citrineos/data';
import { OcpiTariff } from '../model/OcpiTariff';
import { TariffDTO } from '../model/DTO/TariffDTO';
import { TariffDimensionType } from '../model/TariffDimensionType';
import { TariffElement } from '../model/TariffElement';
import { TariffType } from '../model/TariffType';
import { MINUTES_IN_HOUR } from '../util/consts';

@Service()
export class TariffMapper {
  constructor() {}

  public map(coreTariff: Tariff, ocpiTariff: OcpiTariff): TariffDTO {
    return {
      id: ocpiTariff.id,
      country_code: ocpiTariff.countryCode,
      party_id: ocpiTariff.partyId,
      currency: coreTariff.currency,
      type: TariffType.AD_HOC_PAYMENT,
      tariff_alt_text: ocpiTariff.tariffAltText,
      tariff_alt_url: undefined,
      min_price: undefined,
      max_price: undefined,
      elements: [this.getTariffElement(coreTariff)],
      energy_mix: undefined,
      start_date_time: undefined,
      end_date_time: undefined,
      last_updated: coreTariff.updatedAt,
    };
  }

  private getTariffElement(coreTariff: Tariff): TariffElement {
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
}
