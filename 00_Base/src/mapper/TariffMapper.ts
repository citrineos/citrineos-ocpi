// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { Service } from 'typedi';
import { TariffDTO } from '../model/DTO/tariffs/TariffDTO';
import { TariffDimensionType } from '../model/TariffDimensionType';
import { TariffElement } from '../model/TariffElement';
import { TariffType } from '../model/TariffType';
import { MINUTES_IN_HOUR } from '../util/Consts';
import { ITariffDto } from '@citrineos/base';

export class TariffMapper {
  constructor() {}

  public static map(coreTariff: Partial<ITariffDto>): TariffDTO {
    return {
      id: coreTariff.id!.toString(),
      country_code: coreTariff.tenant!.countryCode!,
      party_id: coreTariff.tenant!.partyId!,
      currency: coreTariff.currency!,
      type: TariffType.AD_HOC_PAYMENT,
      // tariff_alt_text: coreTariff.tariffAltText
      //   ? (coreTariff.tariffAltText[0] as any)?.text
      //   : undefined,
      tariff_alt_url: undefined,
      min_price: undefined,
      max_price: undefined,
      elements: [TariffMapper.getTariffElement(coreTariff)],
      energy_mix: undefined,
      start_date_time: undefined,
      end_date_time: undefined,
      last_updated: coreTariff.updatedAt!,
    };
  }
  private static getTariffElement(
    coreTariff: Partial<ITariffDto>,
  ): TariffElement {
    return {
      price_components: [
        {
          type: TariffDimensionType.ENERGY,
          price: coreTariff.pricePerKwh!,
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
  ): Partial<ITariffDto> {
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
