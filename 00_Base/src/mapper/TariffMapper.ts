// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import type { TariffDTO } from '../model/DTO/tariffs/TariffDTO.js';
import type { PutTariffRequest } from '../model/DTO/tariffs/PutTariffRequest.js';
import { TariffDimensionType } from '../model/TariffDimensionType.js';
import type { TariffElement } from '../model/TariffElement.js';
import { TariffType } from '../model/TariffType.js';
import { MINUTES_IN_HOUR } from '../util/Consts.js';
import type { TariffDto } from '@citrineos/base';

export class TariffMapper {
  constructor() {}

  public static map(coreTariff: Partial<TariffDto>): TariffDTO {
    let tariffAltText: Array<{ language: string; text: string }> | undefined;
    if (coreTariff.tariffAltText) {
      if (typeof coreTariff.tariffAltText === 'string') {
        try {
          tariffAltText = JSON.parse(coreTariff.tariffAltText);
        } catch {
          tariffAltText = undefined;
        }
      } else if (Array.isArray(coreTariff.tariffAltText)) {
        tariffAltText = coreTariff.tariffAltText as Array<{
          language: string;
          text: string;
        }>;
      }
    }

    return {
      id: coreTariff.id!.toString(),
      country_code: coreTariff.tenant!.countryCode!,
      party_id: coreTariff.tenant!.partyId!,
      currency: coreTariff.currency!,
      type: TariffType.AD_HOC_PAYMENT,
      tariff_alt_text: tariffAltText,
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
    coreTariff: Partial<TariffDto>,
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

  public static mapElementsToCoreTariff(
    tariffElements: TariffElement[],
  ): Partial<TariffDto> {
    const tariffElement = tariffElements[0];
    const priceComponents = tariffElement?.price_components ?? [];
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

  public static mapFromOcpi(
    tariff: PutTariffRequest,
    tenantId?: number,
  ): Partial<TariffDto> {
    const coreFields = TariffMapper.mapElementsToCoreTariff(tariff.elements);
    const now = new Date().toISOString();
    return {
      id: parseInt(tariff.id, 10),
      currency: tariff.currency,
      tariffAltText: tariff.tariff_alt_text
        ? JSON.stringify(tariff.tariff_alt_text)
        : (undefined as any),
      createdAt: now,
      updatedAt: now,
      ...(tenantId !== undefined && { tenantId }),
      ...coreFields,
    } as Partial<TariffDto>;
  }
}
