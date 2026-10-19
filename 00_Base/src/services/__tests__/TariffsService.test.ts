// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

jest.mock('../../mapper/index', () => ({
  ...jest.requireActual('../../mapper/TariffMapper'),
  TariffMapper: jest.requireActual('../../mapper/TariffMapper').TariffMapper,
}));

import { TariffsService } from '../TariffsService';
import type { TenantPartnerDto } from '@zetra/citrineos-base';
import { Logger } from 'tslog';
import { OcpiGraphqlClient } from '../../graphql/OcpiGraphqlClient';
import { OcpiHeaders } from '../../model/OcpiHeaders';
import { PaginatedParams } from '../../controllers/param/PaginatedParams';
import { TariffDimensionType } from '../../model/TariffDimensionType';
import {
  GET_TARIFF_BY_KEY_QUERY,
  GET_TARIFF_BY_OCPI_ID_QUERY,
  GET_TARIFF_BY_PARTNER_QUERY,
  GET_TARIFFS_QUERY,
  CREATE_OR_UPDATE_TARIFF_MUTATION,
  INSERT_PARTNER_TARIFF_MUTATION,
  DELETE_TARIFF_BY_PARTNER_MUTATION,
} from '../../graphql/queries/tariff.queries';
import { GET_TENANT_PARTNER_ID_BY_COUNTRY_PARTY } from '../../graphql/queries/tenantPartner.queries';

jest.mock('../../graphql/OcpiGraphqlClient');

const mockCoreTariff = {
  id: 1,
  ocpiTariffId: null,
  currency: 'EUR',
  pricePerKwh: 0.25,
  pricePerMin: null,
  pricePerSession: null,
  taxRate: 0.2,
  authorizationAmount: null,
  paymentFee: null,
  stationId: 'STATION-01',
  tariffAltText: null,
  tenantPartnerId: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  tenant: {
    countryCode: 'FR',
    partyId: 'HYX',
  },
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

const mockPartnerTariff = {
  ...mockCoreTariff,
  id: 99,
  ocpiTariffId: 'tariff-abc-123',
  tenantPartnerId: 42,
};

const mockPartnerTariffUuid = {
  ...mockCoreTariff,
  id: 100,
  ocpiTariffId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  tenantPartnerId: 42,
};

describe('TariffsService', () => {
  let service: TariffsService;
  let mockGraphqlClient: jest.Mocked<OcpiGraphqlClient>;

  beforeEach(() => {
    mockGraphqlClient = {
      request: jest.fn(),
    } as any;
    service = new TariffsService(
      mockGraphqlClient,
      new Logger({ type: 'hidden' }),
      {} as any,
    );
  });

  describe('getTariffByOcpiId', () => {
    it('should use GET_TARIFF_BY_OCPI_ID_QUERY with string ocpiTariffId by default (tenant lookup)', async () => {
      mockGraphqlClient.request.mockResolvedValue({
        Tariffs: [mockCoreTariff],
      });

      const result = await service.getTariffByOcpiId('FR', 'HYX', 'tariff-1');

      expect(mockGraphqlClient.request).toHaveBeenCalledWith(
        GET_TARIFF_BY_OCPI_ID_QUERY,
        { ocpiTariffId: 'tariff-1', countryCode: 'FR', partyId: 'HYX' },
      );
      expect(result).toBeDefined();
    });

    it('should resolve TenantPartner id then GET_TARIFF_BY_PARTNER_QUERY with string ocpiTariffId when isPartnerLookup is true', async () => {
      mockGraphqlClient.request
        .mockResolvedValueOnce({ TenantPartners: [{ id: 42 }] })
        .mockResolvedValueOnce({ Tariffs: [mockPartnerTariff] });

      const result = await service.getTariffByOcpiId(
        'DE',
        'CPO',
        'tariff-abc-123',
        undefined,
        true,
      );

      expect(mockGraphqlClient.request).toHaveBeenNthCalledWith(
        1,
        GET_TENANT_PARTNER_ID_BY_COUNTRY_PARTY,
        { countryCode: 'DE', partyId: 'CPO' },
      );
      expect(mockGraphqlClient.request).toHaveBeenNthCalledWith(
        2,
        GET_TARIFF_BY_PARTNER_QUERY,
        { ocpiTariffId: 'tariff-abc-123', tenantPartnerId: 42 },
      );
      expect(result).toBeDefined();
      expect(result!.id).toBe('tariff-abc-123');
    });

    it('should work with UUID-format tariff IDs', async () => {
      mockGraphqlClient.request
        .mockResolvedValueOnce({ TenantPartners: [{ id: 42 }] })
        .mockResolvedValueOnce({ Tariffs: [mockPartnerTariffUuid] });

      const result = await service.getTariffByOcpiId(
        'DE',
        'CPO',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        undefined,
        true,
      );

      expect(mockGraphqlClient.request).toHaveBeenNthCalledWith(
        2,
        GET_TARIFF_BY_PARTNER_QUERY,
        {
          ocpiTariffId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
          tenantPartnerId: 42,
        },
      );
      expect(result).toBeDefined();
      expect(result!.id).toBe('f47ac10b-58cc-4372-a567-0e02b2c3d479');
    });

    it('should return undefined when tariff is not found', async () => {
      mockGraphqlClient.request.mockResolvedValue({
        Tariffs: [],
      });

      const result = await service.getTariffByOcpiId(
        'FR',
        'HYX',
        'non-existent-tariff',
      );

      expect(result).toBeUndefined();
    });
  });

  describe('getTariffs', () => {
    it('should return paginated tariffs with tenantPartnerId IS NULL filter', async () => {
      mockGraphqlClient.request.mockResolvedValue({
        Tariffs: [mockCoreTariff, { ...mockCoreTariff, id: 2 }],
      });

      const ocpiHeaders = new OcpiHeaders('DE', 'ABC', 'FR', 'HYX');

      const paginatedParams = new PaginatedParams();
      paginatedParams.limit = 10;
      paginatedParams.offset = 0;

      const result = await service.getTariffs(ocpiHeaders, paginatedParams);

      expect(mockGraphqlClient.request).toHaveBeenCalledWith(
        GET_TARIFFS_QUERY,
        expect.objectContaining({
          where: expect.objectContaining({
            tenantPartnerId: { _is_null: true },
            Tenant: {
              countryCode: { _eq: 'FR' },
              partyId: { _eq: 'HYX' },
            },
          }),
        }),
      );
      expect(result.data).toHaveLength(2);
      expect(result.count).toBe(2);
      expect(result.data[0].id).toBe('FRHYXT000001');
      expect(result.data[1].id).toBe('FRHYXT000002');
    });

    it('should apply date filters when provided', async () => {
      mockGraphqlClient.request.mockResolvedValue({
        Tariffs: [],
      });

      const ocpiHeaders = new OcpiHeaders('DE', 'ABC', 'FR', 'HYX');

      const dateFrom = new Date('2024-01-01');
      const dateTo = new Date('2024-12-31');

      const paginatedParams = new PaginatedParams();
      paginatedParams.limit = 10;
      paginatedParams.offset = 0;
      paginatedParams.dateFrom = dateFrom;
      paginatedParams.dateTo = dateTo;

      await service.getTariffs(ocpiHeaders, paginatedParams);

      expect(mockGraphqlClient.request).toHaveBeenCalledWith(
        GET_TARIFFS_QUERY,
        expect.objectContaining({
          where: expect.objectContaining({
            updatedAt: {
              _gte: dateFrom.toISOString(),
              _lte: dateTo.toISOString(),
            },
            tenantPartnerId: { _is_null: true },
          }),
        }),
      );
    });
  });

  describe('createOrUpdateTariff', () => {
    it('should use partner mutation when tenantPartnerId is provided', async () => {
      mockGraphqlClient.request.mockResolvedValue({
        insert_Tariffs_one: mockPartnerTariff,
      });

      const result = await service.createOrUpdateTariff(
        {
          id: 'tariff-abc-123',
          country_code: 'DE',
          party_id: 'CPO',
          currency: 'EUR',
          elements: [
            {
              price_components: [
                {
                  type: TariffDimensionType.ENERGY,
                  price: 0.3,
                  step_size: 1,
                },
              ],
            },
          ],
        },
        10,
        42,
        { id: 42, countryCode: 'DE', partyId: 'CPO' } as unknown as TenantPartnerDto,
      );

      expect(mockGraphqlClient.request).toHaveBeenCalledWith(
        INSERT_PARTNER_TARIFF_MUTATION,
        expect.objectContaining({
          object: expect.objectContaining({
            ocpiTariffId: 'tariff-abc-123',
            tenantId: 10,
            tenantPartnerId: 42,
          }),
        }),
      );
      expect(result!.id).toBe('tariff-abc-123');
    });

    it('should return undefined when tenantPartnerId is not provided (own-tariff path is currently disabled)', async () => {
      const result = await service.createOrUpdateTariff(
        {
          id: 'own-tariff-1',
          country_code: 'FR',
          party_id: 'HYX',
          currency: 'EUR',
          elements: [
            {
              price_components: [
                {
                  type: TariffDimensionType.ENERGY,
                  price: 0.25,
                  step_size: 1,
                },
              ],
            },
          ],
        },
        10,
        undefined,
        { id: 5, countryCode: 'FR', partyId: 'HYX' } as unknown as TenantPartnerDto,
      );

      expect(mockGraphqlClient.request).not.toHaveBeenCalledWith(
        CREATE_OR_UPDATE_TARIFF_MUTATION,
        expect.anything(),
      );
      expect(result).toBeUndefined();
    });

    it('should handle UUID-format tariff IDs', async () => {
      mockGraphqlClient.request.mockResolvedValue({
        insert_Tariffs_one: mockPartnerTariffUuid,
      });

      const result = await service.createOrUpdateTariff(
        {
          id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
          country_code: 'DE',
          party_id: 'CPO',
          currency: 'EUR',
          elements: [
            {
              price_components: [
                {
                  type: TariffDimensionType.ENERGY,
                  price: 0.25,
                  step_size: 1,
                },
              ],
            },
          ],
        },
        10,
        42,
        { id: 42, countryCode: 'DE', partyId: 'CPO' } as unknown as TenantPartnerDto,
      );

      expect(mockGraphqlClient.request).toHaveBeenCalledWith(
        INSERT_PARTNER_TARIFF_MUTATION,
        expect.objectContaining({
          object: expect.objectContaining({
            ocpiTariffId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
          }),
        }),
      );
      expect(result!.id).toBe('f47ac10b-58cc-4372-a567-0e02b2c3d479');
    });

    it('should throw when mutation returns null', async () => {
      mockGraphqlClient.request.mockResolvedValue({
        insert_Tariffs_one: null,
      });

      await expect(
        service.createOrUpdateTariff(
          {
            id: 'tariff-fail',
            country_code: 'FR',
            party_id: 'HYX',
            currency: 'EUR',
            elements: [
              {
                price_components: [
                  {
                    type: TariffDimensionType.ENERGY,
                    price: 0.25,
                    step_size: 1,
                  },
                ],
              },
            ],
          },
          10,
          42,
          { id: 42, countryCode: 'FR', partyId: 'HYX' } as unknown as TenantPartnerDto,
        ),
      ).rejects.toThrow('Insert failed');
    });
  });

  describe('deleteTariff', () => {
    it('should use partner delete mutation with string ocpiTariffId', async () => {
      mockGraphqlClient.request.mockResolvedValueOnce({
        delete_Tariffs: { affected_rows: 1 },
      });

      await service.deleteTariff(
        'DE',
        'CPO',
        'tariff-abc-123',
        true,
        { id: 42, countryCode: 'DE', partyId: 'CPO' } as unknown as TenantPartnerDto,
      );

      expect(mockGraphqlClient.request).toHaveBeenNthCalledWith(
        1,
        DELETE_TARIFF_BY_PARTNER_MUTATION,
        { ocpiTariffId: 'tariff-abc-123', tenantPartnerId: 42 },
      );
    });

    it('should throw when partner tariff is not found', async () => {
      mockGraphqlClient.request.mockResolvedValueOnce({
        delete_Tariffs: { affected_rows: 0 },
      });

      await expect(
        service.deleteTariff(
          'DE',
          'CPO',
          'non-existent-tariff',
          true,
          { id: 42, countryCode: 'DE', partyId: 'CPO' } as unknown as TenantPartnerDto,
        ),
      ).rejects.toThrow('Tariff non-existent-tariff not found for DE/CPO');
    });

    it('should throw when tenant partner is not found', async () => {
      mockGraphqlClient.request.mockResolvedValue({
        TenantPartners: [],
      });

      await expect(
        service.deleteTariff('XX', 'UNK', 'tariff-abc-123', true),
      ).rejects.toThrow('Tariff tariff-abc-123 not found for XX/UNK');
    });
  });
});
