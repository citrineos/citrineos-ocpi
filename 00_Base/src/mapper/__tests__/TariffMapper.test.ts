// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { TariffMapper, type TariffMapInput } from '../TariffMapper';
import { TariffDimensionType } from '../../model/TariffDimensionType';
import { TariffType } from '../../model/TariffType';
import type { PutTariffRequest } from '../../model/DTO/tariffs/PutTariffRequest';

describe('TariffMapper', () => {
  describe('mapForReceiver (core -> OCPI, EMSP-received tariff)', () => {
    it('should use ocpiTariffId when present (partner tariff)', () => {
      const coreTariff: TariffMapInput = {
        id: 42,
        ocpiTariffId: 'tariff-abc-123',
        currency: 'EUR',
        updatedAt: new Date('2024-01-01T00:00:00Z'),
        tenant: { countryCode: 'FR', partyId: 'HYX' },
        TariffElements: [
          {
            priceComponents: [
              {
                type: TariffDimensionType.ENERGY,
                price: 0.25,
                vat: 0.2,
                step_size: 1,
              },
            ],
          },
        ],
      };

      const result = TariffMapper.mapForReceiver(coreTariff);

      expect(result.id).toBe('tariff-abc-123');
      expect(result.country_code).toBe('FR');
      expect(result.party_id).toBe('HYX');
    });

    it('should fall back to id.toString() when ocpiTariffId is absent (own tariff)', () => {
      const coreTariff: TariffMapInput = {
        id: 1,
        currency: 'EUR',
        tariffType: TariffType.AD_HOC_PAYMENT,
        updatedAt: new Date('2024-01-01T00:00:00Z'),
        tenant: { countryCode: 'FR', partyId: 'HYX' },
        TariffElements: [
          {
            priceComponents: [
              {
                type: TariffDimensionType.ENERGY,
                price: 0.25,
                vat: 0.2,
                step_size: 1,
              },
            ],
          },
        ],
      };

      const result = TariffMapper.mapForReceiver(coreTariff);

      expect(result.id).toBe('1');
      expect(result.country_code).toBe('FR');
      expect(result.party_id).toBe('HYX');
      expect(result.currency).toBe('EUR');
      expect(result.type).toBe(TariffType.AD_HOC_PAYMENT);
      expect(result.elements).toHaveLength(1);
      expect(result.elements[0].price_components).toEqual([
        {
          type: TariffDimensionType.ENERGY,
          price: 0.25,
          vat: 0.2,
          step_size: 1,
        },
      ]);
      expect(result.last_updated).toEqual(new Date('2024-01-01T00:00:00Z'));
    });

    it('should map price_components and restrictions straight through from TariffElements', () => {
      const coreTariff: TariffMapInput = {
        id: 2,
        currency: 'EUR',
        updatedAt: new Date('2024-06-15T12:00:00Z'),
        tenant: { countryCode: 'DE', partyId: 'ABC' },
        TariffElements: [
          {
            priceComponents: [
              {
                type: TariffDimensionType.ENERGY,
                price: 0.3,
                vat: 0.19,
                step_size: 1,
              },
              {
                type: TariffDimensionType.TIME,
                price: 0.6,
                vat: 0.19,
                step_size: 60,
              },
              {
                type: TariffDimensionType.FLAT,
                price: 1.5,
                vat: 0.19,
                step_size: 1,
              },
            ],
            restrictions: { min_kwh: 5 },
          },
        ],
      };

      const result = TariffMapper.mapForReceiver(coreTariff);

      expect(result.elements[0].price_components).toHaveLength(3);
      expect(result.elements[0].restrictions).toEqual({ min_kwh: 5 });
    });

    it('should throw when there are no TariffElements', () => {
      const coreTariff: TariffMapInput = {
        id: 3,
        ocpiTariffId: 'tariff-no-elements',
        currency: 'EUR',
        tenant: { countryCode: 'FR', partyId: 'HYX' },
        TariffElements: [],
      };

      expect(() => TariffMapper.mapForReceiver(coreTariff)).toThrow(
        /has no TariffElements/,
      );
    });

    it('should throw when neither tenantPartner, roamingPartner, nor tenant provide country/party', () => {
      const coreTariff: TariffMapInput = {
        id: 4,
        currency: 'EUR',
        TariffElements: [
          {
            priceComponents: [
              { type: TariffDimensionType.ENERGY, price: 0.25, step_size: 1 },
            ],
          },
        ],
      };

      expect(() => TariffMapper.mapForReceiver(coreTariff)).toThrow(
        /neither tenantPartner nor tenant/,
      );
    });

    it('should prefer roamingPartner, then tenantPartner, then tenant for country/party', () => {
      const base: TariffMapInput = {
        id: 5,
        currency: 'EUR',
        TariffElements: [
          {
            priceComponents: [
              { type: TariffDimensionType.ENERGY, price: 0.25, step_size: 1 },
            ],
          },
        ],
        tenant: { countryCode: 'FR', partyId: 'TEN' },
        tenantPartner: { countryCode: 'DE', partyId: 'TNP' },
        roamingPartner: { countryCode: 'BE', partyId: 'ROA' } as any,
      };

      expect(TariffMapper.mapForReceiver(base).country_code).toBe('BE');

      const { roamingPartner, ...withoutRoaming } = base;
      expect(TariffMapper.mapForReceiver(withoutRoaming).country_code).toBe(
        'DE',
      );

      const { tenantPartner, ...tenantOnly } = withoutRoaming;
      expect(TariffMapper.mapForReceiver(tenantOnly).country_code).toBe('FR');
    });

    it('should parse tariff_alt_text from a JSON string', () => {
      const coreTariff: TariffMapInput = {
        id: 6,
        currency: 'EUR',
        tariffAltText: JSON.stringify([
          { language: 'en', text: 'Standard tariff' },
        ]),
        tenant: { countryCode: 'FR', partyId: 'HYX' },
        TariffElements: [
          {
            priceComponents: [
              { type: TariffDimensionType.ENERGY, price: 0.2, step_size: 1 },
            ],
          },
        ],
      };

      const result = TariffMapper.mapForReceiver(coreTariff);

      expect(result.tariff_alt_text).toEqual([
        { language: 'en', text: 'Standard tariff' },
      ]);
    });

    it('should pass tariff_alt_text through as-is when already an array', () => {
      const coreTariff: TariffMapInput = {
        id: 7,
        currency: 'EUR',
        tariffAltText: [{ language: 'en', text: 'Standard tariff' }],
        tenant: { countryCode: 'FR', partyId: 'HYX' },
        TariffElements: [
          {
            priceComponents: [
              { type: TariffDimensionType.ENERGY, price: 0.2, step_size: 1 },
            ],
          },
        ],
      };

      const result = TariffMapper.mapForReceiver(coreTariff);

      expect(result.tariff_alt_text).toEqual([
        { language: 'en', text: 'Standard tariff' },
      ]);
    });
  });

  describe('formatOwnTariffId', () => {
    it('should format a zero-padded id with tenant country/party', () => {
      const coreTariff: TariffMapInput = {
        id: 7,
        tenant: { countryCode: 'FR', partyId: 'HYX' },
      };

      expect(TariffMapper.formatOwnTariffId(coreTariff)).toBe('FRHYXT000007');
    });

    it('should throw when tenant country/party identifiers are missing', () => {
      const coreTariff: TariffMapInput = {
        id: 8,
        tenant: { countryCode: 'FR' },
      };

      expect(() => TariffMapper.formatOwnTariffId(coreTariff)).toThrow(
        /Tenant country\/party identifiers are required/,
      );
    });
  });

  describe('mapFromOcpi (OCPI -> core)', () => {
    it('should store the OCPI tariff id as ocpiTariffId and leave numeric id unset', () => {
      const ocpiTariff: PutTariffRequest = {
        id: 'tariff-abc-123',
        country_code: 'FR',
        party_id: 'HYX',
        currency: 'EUR',
        type: TariffType.AD_HOC_PAYMENT,
        elements: [
          {
            price_components: [
              {
                type: TariffDimensionType.ENERGY,
                price: 0.25,
                vat: 0.2,
                step_size: 1,
              },
            ],
          },
        ],
      };

      const { coreTariff, TariffElements } =
        TariffMapper.mapFromOcpi(ocpiTariff);

      expect(coreTariff.ocpiTariffId).toBe('tariff-abc-123');
      expect((coreTariff as any).id).toBeUndefined();
      expect(coreTariff.currency).toBe('EUR');
      expect((coreTariff as any).tariffType).toBe(TariffType.AD_HOC_PAYMENT);
      expect(TariffElements).toHaveLength(1);
      expect(TariffElements[0].priceComponents).toEqual(
        ocpiTariff.elements[0].price_components,
      );
    });

    it('should default tariffType to null when type is absent', () => {
      const ocpiTariff: PutTariffRequest = {
        id: 'tariff-no-type',
        country_code: 'DE',
        party_id: 'XYZ',
        currency: 'EUR',
        elements: [
          {
            price_components: [
              { type: TariffDimensionType.ENERGY, price: 0.3, step_size: 1 },
            ],
          },
        ],
      };

      const { coreTariff } = TariffMapper.mapFromOcpi(ocpiTariff);

      expect((coreTariff as any).tariffType).toBeNull();
    });

    it('should include tariff_alt_text as a JSON string when present', () => {
      const ocpiTariff: PutTariffRequest = {
        id: 'tariff-alt-text-test',
        country_code: 'DE',
        party_id: 'XYZ',
        currency: 'EUR',
        tariff_alt_text: [{ language: 'de', text: 'Standardtarif' }],
        elements: [
          {
            price_components: [
              { type: TariffDimensionType.ENERGY, price: 0.3, step_size: 1 },
            ],
          },
        ],
      };

      const { coreTariff } = TariffMapper.mapFromOcpi(ocpiTariff);

      expect(JSON.parse(coreTariff.tariffAltText as unknown as string)).toEqual(
        [{ language: 'de', text: 'Standardtarif' }],
      );
    });

    it('should include tenantId and tenantPartnerId when provided', () => {
      const ocpiTariff: PutTariffRequest = {
        id: 'partner-tariff-55',
        country_code: 'FR',
        party_id: 'HYX',
        currency: 'EUR',
        elements: [
          {
            price_components: [
              { type: TariffDimensionType.ENERGY, price: 0.25, step_size: 1 },
            ],
          },
        ],
      };

      const { coreTariff } = TariffMapper.mapFromOcpi(ocpiTariff, 10, 42);

      expect((coreTariff as any).tenantId).toBe(10);
      expect((coreTariff as any).tenantPartnerId).toBe(42);
    });

    it('should not include tenantPartnerId when not provided', () => {
      const ocpiTariff: PutTariffRequest = {
        id: 'own-tariff-56',
        country_code: 'FR',
        party_id: 'HYX',
        currency: 'EUR',
        elements: [
          {
            price_components: [
              { type: TariffDimensionType.ENERGY, price: 0.25, step_size: 1 },
            ],
          },
        ],
      };

      const { coreTariff } = TariffMapper.mapFromOcpi(ocpiTariff, 10);

      expect((coreTariff as any).tenantId).toBe(10);
      expect((coreTariff as any).tenantPartnerId).toBeUndefined();
    });

    it('should include roamingPartnerId when a roaming partner is provided', () => {
      const ocpiTariff: PutTariffRequest = {
        id: 'roaming-tariff-1',
        country_code: 'FR',
        party_id: 'HYX',
        currency: 'EUR',
        elements: [
          {
            price_components: [
              { type: TariffDimensionType.ENERGY, price: 0.25, step_size: 1 },
            ],
          },
        ],
      };

      const { coreTariff } = TariffMapper.mapFromOcpi(
        ocpiTariff,
        undefined,
        undefined,
        { id: 99 } as any,
      );

      expect((coreTariff as any).roamingPartnerId).toBe(99);
    });
  });

  describe('mapForSender (core -> OCPI, CPO-sent tariff)', () => {
    it('should use ocpiTariffId when present (partner tariff)', () => {
      const coreTariff: TariffMapInput = {
        id: 42,
        ocpiTariffId: 'tariff-abc-123',
        currency: 'EUR',
        updatedAt: new Date('2024-01-01T00:00:00Z'),
        tenant: { countryCode: 'FR', partyId: 'HYX' },
        TariffElements: [
          {
            priceComponents: [
              {
                type: TariffDimensionType.ENERGY,
                price: 0.25,
                vat: 0.2,
                step_size: 1,
              },
            ],
          },
        ],
      };

      const result = TariffMapper.mapForSender(coreTariff);

      expect(result.id).toBe('tariff-abc-123');
      expect(result.country_code).toBe('FR');
      expect(result.party_id).toBe('HYX');
    });

    it('should use formatOwnTariffId when ocpiTariffId is absent (own tariff)', () => {
      const coreTariff: TariffMapInput = {
        id: 7,
        currency: 'EUR',
        updatedAt: new Date('2024-01-01T00:00:00Z'),
        tenant: { countryCode: 'FR', partyId: 'HYX' },
        TariffElements: [
          {
            priceComponents: [
              { type: TariffDimensionType.ENERGY, price: 0.25, step_size: 1 },
            ],
          },
        ],
      };

      const result = TariffMapper.mapForSender(coreTariff);

      expect(result.id).toBe('FRHYXT000007');
    });

    it('should throw when TariffElements is an empty array', () => {
      const coreTariff: TariffMapInput = {
        id: 9,
        ocpiTariffId: 'tariff-empty-elements',
        currency: 'EUR',
        tenant: { countryCode: 'FR', partyId: 'HYX' },
        TariffElements: [],
      };

      expect(() => TariffMapper.mapForSender(coreTariff)).toThrow(
        /has no TariffElements/,
      );
    });

    it('should derive country/party from tenantPartner over tenant', () => {
      const coreTariff: TariffMapInput = {
        id: 10,
        ocpiTariffId: 'tariff-tp',
        currency: 'EUR',
        tenant: { countryCode: 'FR', partyId: 'TEN' },
        tenantPartner: { countryCode: 'DE', partyId: 'TNP' },
        TariffElements: [
          {
            priceComponents: [
              { type: TariffDimensionType.ENERGY, price: 0.25, step_size: 1 },
            ],
          },
        ],
      };

      const result = TariffMapper.mapForSender(coreTariff);

      expect(result.country_code).toBe('DE');
      expect(result.party_id).toBe('TNP');
    });

    it('should include type only when tariffType is a valid, recognized value', () => {
      const valid: TariffMapInput = {
        id: 11,
        ocpiTariffId: 'tariff-valid-type',
        currency: 'EUR',
        tariffType: TariffType.REGULAR,
        tenant: { countryCode: 'FR', partyId: 'HYX' },
        TariffElements: [
          {
            priceComponents: [
              { type: TariffDimensionType.ENERGY, price: 0.25, step_size: 1 },
            ],
          },
        ],
      };
      expect(TariffMapper.mapForSender(valid).type).toBe(TariffType.REGULAR);

      const invalid: TariffMapInput = {
        ...valid,
        tariffType: 'NOT_A_REAL_TYPE',
      };
      expect(TariffMapper.mapForSender(invalid).type).toBeUndefined();
    });

    it('should omit tariff_alt_text when it resolves to an empty array', () => {
      const coreTariff: TariffMapInput = {
        id: 12,
        ocpiTariffId: 'tariff-no-alt-text',
        currency: 'EUR',
        tariffAltText: [],
        tenant: { countryCode: 'FR', partyId: 'HYX' },
        TariffElements: [
          {
            priceComponents: [
              { type: TariffDimensionType.ENERGY, price: 0.25, step_size: 1 },
            ],
          },
        ],
      };

      expect(
        TariffMapper.mapForSender(coreTariff).tariff_alt_text,
      ).toBeUndefined();
    });
  });

  describe('round-trip mapping', () => {
    it('should preserve price_components through mapForReceiver -> mapFromOcpi round trip', () => {
      const coreTariff: TariffMapInput = {
        id: 10,
        currency: 'EUR',
        updatedAt: new Date('2024-01-01T00:00:00Z'),
        tenant: { countryCode: 'FR', partyId: 'HYX' },
        TariffElements: [
          {
            priceComponents: [
              {
                type: TariffDimensionType.ENERGY,
                price: 0.25,
                vat: 0.2,
                step_size: 1,
              },
              {
                type: TariffDimensionType.TIME,
                price: 1.2,
                vat: 0.2,
                step_size: 60,
              },
              {
                type: TariffDimensionType.FLAT,
                price: 1.0,
                vat: 0.2,
                step_size: 1,
              },
            ],
          },
        ],
      };

      const ocpiTariff = TariffMapper.mapForReceiver(coreTariff);
      const { TariffElements } = TariffMapper.mapFromOcpi(ocpiTariff);

      expect(TariffElements[0].priceComponents).toEqual(
        coreTariff.TariffElements![0].priceComponents,
      );
    });
  });
});
