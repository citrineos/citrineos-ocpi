// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import type { TariffDTO } from '../model/DTO/tariffs/TariffDTO.js';
import type { PutTariffRequest } from '../model/DTO/tariffs/PutTariffRequest.js';
import { TariffDimensionType } from '../model/TariffDimensionType.js';
import type { TariffElement } from '../model/TariffElement.js';
import { TariffType } from '../model/TariffType.js';
import { MINUTES_IN_HOUR } from '../util/Consts.js';
import type { TariffDto, RoamingPartnerDto } from '@zetra/citrineos-base';
import type { Price } from '../model/Price.js';
import type { EnergyMix } from '../model/EnergyMix.js';

export type TariffMapInput = {
  id?: number;
  ocpiTariffId?: string | null;
  stationId?: string | null;
  authorizationAmount?: unknown;
  paymentFee?: unknown;
  pricePerKwh?: unknown;
  pricePerMin?: unknown;
  pricePerSession?: unknown;
  taxRate?: unknown;
  currency?: string;
  tariffAltText?: string | Record<string, unknown> | null | unknown[];
  tariffAltUrl?: string | null;
  minPrice?: unknown;
  maxPrice?: unknown;
  energyMix?: unknown;
  startDateTime?: string | Date | null;
  endDateTime?: string | Date | null;
  tenantPartnerId?: number | null;
  tenantId?: number;
  tenant?: { countryCode?: string | null; partyId?: string | null } | null;
  tenantPartner?: {
    countryCode?: string | null;
    partyId?: string | null;
  } | null;
  TariffElements?: Array<{
    priceComponents: unknown;
    restrictions?: unknown | null;
  }>;
  tariffType?: string | null;
  updatedAt?: string | Date;
  createdAt?: string | Date;
};

function toOptionalDate(v: string | Date | null | undefined): Date | undefined {
  if (v == null) return undefined;
  return v instanceof Date ? v : new Date(v);
}

function toDate(v: string | Date | null | undefined): Date {
  if (v == null) return new Date();
  return v instanceof Date ? v : new Date(v);
}

function toTariffType(v: string | null | undefined): TariffType | null {
  if (v != null && (Object.values(TariffType) as string[]).includes(v)) {
    return v as unknown as TariffType;
  }
  return null;
}

export class TariffMapper {
  constructor() {}

  public static mapForSender(coreTariff: TariffMapInput): TariffDTO {
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
      id: (coreTariff as any).ocpiTariffId ?? coreTariff.id!.toString(),
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
      last_updated: toDate(coreTariff.updatedAt),
    };
  }

  public static mapForReceiver(coreTariff: TariffMapInput): TariffDTO {
    console.log('MAP FOR RECEIVER CORE TARIFF ', coreTariff);
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

    console.log('CORE TARIFF ', coreTariff);

    const elements: TariffElement[] =
      (coreTariff as any).TariffElements?.length > 0
        ? (coreTariff as any).TariffElements.map((el: any) => ({
            price_components: el.priceComponents,
            restrictions: el.restrictions ?? undefined,
          }))
        : [TariffMapper.getTariffElement(coreTariff)];

    const countryCode =
      coreTariff.tenantPartner?.countryCode ?? coreTariff.tenant?.countryCode;
    const partyId =
      coreTariff.tenantPartner?.partyId ?? coreTariff.tenant?.partyId;

    if (!countryCode || !partyId) {
      throw new Error(
        `Tariff ${coreTariff.id ?? coreTariff.ocpiTariffId} has neither tenantPartner nor tenant country/party identifiers`,
      );
    }

    return {
      id: (coreTariff as any).ocpiTariffId ?? coreTariff.id!.toString(),
      country_code: countryCode,
      party_id: partyId,
      currency: coreTariff.currency!,
      type: toTariffType(coreTariff.tariffType),
      tariff_alt_text: tariffAltText,
      tariff_alt_url: coreTariff?.tariffAltUrl ?? undefined,
      min_price: coreTariff.minPrice as Price | undefined,
      max_price: coreTariff.maxPrice as Price | undefined,
      elements: elements,
      energy_mix: coreTariff.energyMix as EnergyMix | undefined,

      start_date_time: toOptionalDate(coreTariff.startDateTime),
      end_date_time: toOptionalDate(coreTariff.endDateTime),
      last_updated: toDate(coreTariff.updatedAt),
    };
  }

  public static mapForReceiverOCPI(coreTariff: TariffMapInput): TariffDTO {
    console.log('MAP FOR RECEIVER CORE TARIFF ', coreTariff);
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

    if ((coreTariff as any).TariffElements?.length === 0) {
      throw new Error(
        `Tariff ${coreTariff.ocpiTariffId} has no TariffElements`,
      );
    }

    console.log('CORE TARIFF ', coreTariff);

    const elements: TariffElement[] = (coreTariff.TariffElements ?? []).map(
      (el) => ({
        price_components:
          el.priceComponents as TariffElement['price_components'],
        restrictions: el.restrictions ?? undefined,
      }),
    );

    const countryCode =
      coreTariff.tenantPartner?.countryCode ?? coreTariff.tenant?.countryCode;
    const partyId =
      coreTariff.tenantPartner?.partyId ?? coreTariff.tenant?.partyId;

    if (!countryCode || !partyId) {
      throw new Error(
        `Tariff ${coreTariff.id ?? coreTariff.ocpiTariffId} has neither tenantPartner nor tenant country/party identifiers`,
      );
    }

    return {
      id: (coreTariff as any).ocpiTariffId ?? coreTariff.id!.toString(),
      country_code: countryCode,
      party_id: partyId,
      currency: coreTariff.currency!,
      elements: elements,
      start_date_time: toDate(coreTariff.startDateTime),
      end_date_time: toOptionalDate(coreTariff.endDateTime),
      last_updated: toDate(coreTariff.updatedAt),
      ...(coreTariff.tariffType != null &&
        toTariffType(coreTariff.tariffType) != null && {
          type: toTariffType(coreTariff.tariffType)!,
        }),
      ...(tariffAltText != null && tariffAltText.length > 0 && {
        tariff_alt_text: tariffAltText,
      }),
      ...(coreTariff.tariffAltUrl != null && {
        tariff_alt_url: coreTariff.tariffAltUrl,
      }),
      ...(coreTariff.minPrice != null && {
        min_price: coreTariff.minPrice as Price,
      }),
      ...(coreTariff.maxPrice != null && {
        max_price: coreTariff.maxPrice as Price,
      }),
      ...(coreTariff.energyMix != null && {
        energy_mix: coreTariff.energyMix as EnergyMix,
      }),
    };
  }

  private static getTariffElement(coreTariff: TariffMapInput): TariffElement {
    const pricePerKwh = Number(coreTariff.pricePerKwh ?? 0);
    const pricePerMinRaw = coreTariff.pricePerMin;
    const pricePerSessionRaw = coreTariff.pricePerSession;
    const taxRateRaw = coreTariff.taxRate;
    const pricePerMin =
      pricePerMinRaw != null && pricePerMinRaw !== ''
        ? Number(pricePerMinRaw)
        : undefined;
    const pricePerSession =
      pricePerSessionRaw != null && pricePerSessionRaw !== ''
        ? Number(pricePerSessionRaw)
        : undefined;
    const taxRate =
      taxRateRaw != null && taxRateRaw !== '' ? Number(taxRateRaw) : undefined;
    return {
      price_components: [
        {
          type: TariffDimensionType.ENERGY,
          price: pricePerKwh,
          vat: taxRate,
          step_size: 1,
        },
        ...(pricePerMin != null && !Number.isNaN(pricePerMin)
          ? [
              {
                type: TariffDimensionType.TIME,
                price: pricePerMin * MINUTES_IN_HOUR,
                vat: taxRate,
                step_size: 1,
              },
            ]
          : []),
        ...(pricePerSession != null && !Number.isNaN(pricePerSession)
          ? [
              {
                type: TariffDimensionType.FLAT,
                price: pricePerSession,
                vat: taxRate,
                step_size: 1,
              },
            ]
          : []),
      ],
      restrictions: undefined,
    };
  }

  public static mapElementsToCoreTariff(
    TariffElements: TariffElement[],
  ): Partial<TariffDto> {
    const tariffElement = TariffElements[0];
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
    tenantPartnerId?: number,
    roamingPartner?: RoamingPartnerDto | null,
  ): {
    coreTariff: Partial<TariffDto> & { ocpiTariffId?: string };
    TariffElements: Array<{
      priceComponents: any;
      restrictions: any;
      createdAt: string;
      updatedAt: string;
    }>;
  } {
    const coreFields = TariffMapper.mapElementsToCoreTariff(tariff.elements);
    const now = new Date().toISOString();

    const coreTariff = {
      ocpiTariffId: tariff.id,
      currency: tariff.currency,
      tariffType: tariff.type ?? null,
      tariffAltText: tariff.tariff_alt_text
        ? JSON.stringify(tariff.tariff_alt_text)
        : undefined,
      tariffAltUrl: tariff.tariff_alt_url ?? null,
      minPrice: tariff.min_price ?? null,
      maxPrice: tariff.max_price ?? null,
      energyMix: tariff.energy_mix ?? null,
      startDateTime: tariff.start_date_time ?? null,
      endDateTime: tariff.end_date_time ?? null,
      createdAt: now,
      updatedAt: now,
      ...(roamingPartner?.id != null && {
        roamingPartnerId: roamingPartner.id,
      }),
      ...(tenantId !== undefined && { tenantId }),
      ...(tenantPartnerId !== undefined && { tenantPartnerId }),
      ...coreFields,
    } as Partial<TariffDto> & { ocpiTariffId?: string };

    const TariffElements = tariff.elements.map((el) => ({
      priceComponents: el.price_components,
      restrictions: el.restrictions ?? null,
      createdAt: now,
      updatedAt: now,
    }));

    return { coreTariff, TariffElements };
  }
}
