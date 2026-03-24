// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

jest.mock('../../mapper/index', () => ({
  ...jest.requireActual('../../mapper/TokensMapper'),
  TokensMapper: jest.requireActual('../../mapper/TokensMapper').TokensMapper,
}));

import { TokensService } from '../TokensService';
import { OcpiGraphqlClient } from '../../graphql/OcpiGraphqlClient';
import { OcpiLogger } from '../../util/OcpiLogger';
import { TokensClientApi } from '../../trigger/TokensClientApi';
import { OcpiHeaders } from '../../model/OcpiHeaders';
import { PaginatedParams } from '../../controllers/param/PaginatedParams';
import { TokenType } from '../../model/TokenType';
import { AuthorizationInfoAllowed } from '../../model/AuthorizationInfoAllowed';
import { UnknownTokenException } from '../../exception/UnknownTokenException';
import { MissingParamException } from '../../exception/MissingParamException';
import {
  READ_AUTHORIZATION,
  GET_AUTHORIZATION_BY_TOKEN,
  GET_AUTHORIZATIONS_PAGINATED,
  CREATE_AUTHORIZATION_MUTATION,
  UPDATE_TOKEN_MUTATION,
} from '../../graphql/queries/token.queries';

jest.mock('../../graphql/OcpiGraphqlClient');

const mockAuthorization = {
  id: 1,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-06-01T00:00:00Z',
  tenantId: 10,
  idToken: 'TOKEN001',
  idTokenType: 'ISO14443',
  additionalInfo: [
    { additionalIdToken: 'CONTRACT001', type: 'eMAID' },
    { additionalIdToken: 'VIS001', type: 'visual_number' },
    { additionalIdToken: 'IssuerCo', type: 'issuer' },
  ],
  status: 'Accepted',
  realTimeAuth: null,
  language1: 'fr',
  groupAuthorizationId: null,
  tenantPartner: {
    id: 5,
    countryCode: 'FR',
    partyId: 'TMS',
  },
  groupAuthorization: null,
};

const mockBlockedAuthorization = {
  ...mockAuthorization,
  id: 2,
  idToken: 'TOKEN002',
  status: 'Blocked',
};

describe('TokensService', () => {
  let service: TokensService;
  let mockGraphqlClient: jest.Mocked<OcpiGraphqlClient>;
  let mockLogger: jest.Mocked<OcpiLogger>;
  let mockTokensClientApi: jest.Mocked<TokensClientApi>;

  beforeEach(() => {
    mockGraphqlClient = {
      request: jest.fn(),
    } as any;
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
    } as any;
    mockTokensClientApi = {
      postToken: jest.fn(),
      getTokens: jest.fn(),
    } as any;
    service = new TokensService(
      mockLogger,
      mockGraphqlClient,
      mockTokensClientApi,
    );
  });

  describe('getToken', () => {
    it('should return a mapped TokenDTO when token is found', async () => {
      mockGraphqlClient.request.mockResolvedValue({
        Authorizations: [mockAuthorization],
      });

      const result = await service.getToken({
        country_code: 'FR',
        party_id: 'TMS',
        uid: 'TOKEN001',
        type: TokenType.RFID,
      });

      expect(mockGraphqlClient.request).toHaveBeenCalledWith(
        READ_AUTHORIZATION,
        {
          idToken: 'TOKEN001',
          type: 'ISO14443',
          countryCode: 'FR',
          partyId: 'TMS',
        },
      );
      expect(result).toBeDefined();
      expect(result!.uid).toBe('TOKEN001');
      expect(result!.country_code).toBe('FR');
      expect(result!.party_id).toBe('TMS');
      expect(result!.type).toBe(TokenType.RFID);
      expect(result!.valid).toBe(true);
    });

    it('should return undefined when token is not found', async () => {
      mockGraphqlClient.request.mockResolvedValue({
        Authorizations: [],
      });

      const result = await service.getToken({
        country_code: 'FR',
        party_id: 'TMS',
        uid: 'UNKNOWN',
        type: TokenType.RFID,
      });

      expect(result).toBeUndefined();
    });

    it('should default to RFID when type is not specified', async () => {
      mockGraphqlClient.request.mockResolvedValue({
        Authorizations: [mockAuthorization],
      });

      await service.getToken({
        country_code: 'FR',
        party_id: 'TMS',
        uid: 'TOKEN001',
      });

      expect(mockGraphqlClient.request).toHaveBeenCalledWith(
        READ_AUTHORIZATION,
        expect.objectContaining({ type: 'ISO14443' }),
      );
    });
  });

  describe('upsertToken - create', () => {
    it('should create a new token when it does not exist', async () => {
      mockGraphqlClient.request
        .mockResolvedValueOnce({ Authorizations: [] })
        .mockResolvedValueOnce({
          insert_Authorizations_one: mockAuthorization,
        });

      const result = await service.upsertToken(
        {
          country_code: 'FR',
          party_id: 'TMS',
          uid: 'TOKEN001',
          type: TokenType.RFID,
          contract_id: 'CONTRACT001',
          issuer: 'IssuerCo',
          valid: true,
          whitelist: 'ALWAYS' as any,
          last_updated: new Date('2024-06-01T00:00:00Z'),
        },
        10,
        5,
      );

      expect(mockGraphqlClient.request).toHaveBeenCalledWith(
        GET_AUTHORIZATION_BY_TOKEN,
        expect.any(Object),
      );
      expect(mockGraphqlClient.request).toHaveBeenCalledWith(
        CREATE_AUTHORIZATION_MUTATION,
        expect.any(Object),
      );
      expect(result.uid).toBe('TOKEN001');
    });
  });

  describe('upsertToken - update', () => {
    it('should update an existing token', async () => {
      mockGraphqlClient.request
        .mockResolvedValueOnce({
          Authorizations: [mockAuthorization],
        })
        .mockResolvedValueOnce({
          update_Authorizations: {
            returning: [mockAuthorization],
          },
        });

      const result = await service.upsertToken(
        {
          country_code: 'FR',
          party_id: 'TMS',
          uid: 'TOKEN001',
          type: TokenType.RFID,
          contract_id: 'CONTRACT001',
          issuer: 'IssuerCo',
          valid: true,
          whitelist: 'ALWAYS' as any,
          last_updated: new Date('2024-06-01T00:00:00Z'),
        },
        10,
        5,
      );

      expect(mockGraphqlClient.request).toHaveBeenCalledWith(
        UPDATE_TOKEN_MUTATION,
        expect.any(Object),
      );
      expect(result.uid).toBe('TOKEN001');
    });
  });

  describe('patchToken', () => {
    it('should patch an existing token', async () => {
      mockGraphqlClient.request
        .mockResolvedValueOnce({
          Authorizations: [mockAuthorization],
        })
        .mockResolvedValueOnce({
          update_Authorizations: {
            returning: [{ ...mockAuthorization, status: 'Blocked' }],
          },
        });

      const result = await service.patchToken(
        'TOKEN001',
        TokenType.RFID,
        { valid: false, last_updated: new Date('2024-07-01T00:00:00Z') },
        10,
        5,
      );

      expect(result).toBeDefined();
      expect(result.uid).toBe('TOKEN001');
    });

    it('should throw UnknownTokenException when token does not exist', async () => {
      mockGraphqlClient.request.mockResolvedValue({
        Authorizations: [],
      });

      await expect(
        service.patchToken(
          'UNKNOWN',
          TokenType.RFID,
          { valid: false, last_updated: new Date() },
          10,
          5,
        ),
      ).rejects.toThrow(UnknownTokenException);
    });

    it('should throw MissingParamException when last_updated is missing', async () => {
      await expect(
        service.patchToken('TOKEN001', TokenType.RFID, { valid: false }, 10, 5),
      ).rejects.toThrow(MissingParamException);
    });
  });

  describe('getTokensPaginated', () => {
    it('should return paginated tokens', async () => {
      mockGraphqlClient.request.mockResolvedValue({
        Authorizations: [mockAuthorization],
      });

      const ocpiHeaders = new OcpiHeaders('DE', 'ABC', 'FR', 'TMS');
      const paginatedParams = new PaginatedParams();
      paginatedParams.limit = 10;
      paginatedParams.offset = 0;

      const result = await service.getTokensPaginated(
        ocpiHeaders,
        paginatedParams,
      );

      expect(result.data).toHaveLength(1);
      expect(result.count).toBe(1);
      expect(result.data[0].uid).toBe('TOKEN001');
      expect(mockGraphqlClient.request).toHaveBeenCalledWith(
        GET_AUTHORIZATIONS_PAGINATED,
        expect.objectContaining({
          limit: 10,
          offset: 0,
          where: expect.objectContaining({
            TenantPartner: {
              countryCode: { _eq: 'FR' },
              partyId: { _eq: 'TMS' },
            },
          }),
        }),
      );
    });

    it('should apply date filters when provided', async () => {
      mockGraphqlClient.request.mockResolvedValue({
        Authorizations: [],
      });

      const ocpiHeaders = new OcpiHeaders('DE', 'ABC', 'FR', 'TMS');
      const dateFrom = new Date('2024-01-01');
      const dateTo = new Date('2024-12-31');

      const paginatedParams = new PaginatedParams();
      paginatedParams.limit = 10;
      paginatedParams.offset = 0;
      paginatedParams.dateFrom = dateFrom;
      paginatedParams.dateTo = dateTo;

      await service.getTokensPaginated(ocpiHeaders, paginatedParams);

      expect(mockGraphqlClient.request).toHaveBeenCalledWith(
        GET_AUTHORIZATIONS_PAGINATED,
        expect.objectContaining({
          where: expect.objectContaining({
            updatedAt: {
              _gte: dateFrom.toISOString(),
              _lte: dateTo.toISOString(),
            },
          }),
        }),
      );
    });

    it('should return empty list when no tokens found', async () => {
      mockGraphqlClient.request.mockResolvedValue({
        Authorizations: [],
      });

      const ocpiHeaders = new OcpiHeaders('DE', 'ABC', 'FR', 'TMS');

      const result = await service.getTokensPaginated(ocpiHeaders);

      expect(result.data).toHaveLength(0);
      expect(result.count).toBe(0);
    });
  });

  describe('authorizeToken', () => {
    it('should return ALLOWED for an accepted token', async () => {
      mockGraphqlClient.request.mockResolvedValue({
        Authorizations: [mockAuthorization],
      });

      const result = await service.authorizeToken(
        'TOKEN001',
        TokenType.RFID,
        5,
      );

      expect(result.allowed).toBe(AuthorizationInfoAllowed.Allowed);
      expect(result.token.uid).toBe('TOKEN001');
      expect(result.authorization_reference).toBeDefined();
    });

    it('should return BLOCKED for a blocked token', async () => {
      mockGraphqlClient.request.mockResolvedValue({
        Authorizations: [mockBlockedAuthorization],
      });

      const result = await service.authorizeToken(
        'TOKEN002',
        TokenType.RFID,
        5,
      );

      expect(result.allowed).toBe(AuthorizationInfoAllowed.Blocked);
    });

    it('should throw UnknownTokenException for unknown token', async () => {
      mockGraphqlClient.request.mockResolvedValue({
        Authorizations: [],
      });

      await expect(
        service.authorizeToken('UNKNOWN', TokenType.RFID, 5),
      ).rejects.toThrow(UnknownTokenException);
    });

    it('should include LocationReferences when provided', async () => {
      mockGraphqlClient.request.mockResolvedValue({
        Authorizations: [mockAuthorization],
      });

      const locationRefs = {
        location_id: 'LOC001',
        evse_uids: ['EVSE001', 'EVSE002'],
      };

      const result = await service.authorizeToken(
        'TOKEN001',
        TokenType.RFID,
        5,
        locationRefs,
      );

      expect(result.allowed).toBe(AuthorizationInfoAllowed.Allowed);
      expect(result.location).toEqual(locationRefs);
    });

    it('should not include location when not provided', async () => {
      mockGraphqlClient.request.mockResolvedValue({
        Authorizations: [mockAuthorization],
      });

      const result = await service.authorizeToken(
        'TOKEN001',
        TokenType.RFID,
        5,
      );

      expect(result.location).toBeUndefined();
    });
  });
});
