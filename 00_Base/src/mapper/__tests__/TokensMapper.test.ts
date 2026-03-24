// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { TokensMapper } from '../TokensMapper';
import { TokenType } from '../../model/TokenType';
import { WhitelistType } from '../../model/WhitelistType';
import type { AuthorizationDto } from '@citrineos/base';
import {
  AuthorizationStatusEnum,
  AuthorizationWhitelistEnum,
  IdTokenEnum,
  OCPP2_0_1,
} from '@citrineos/base';

const mockAuthorization: Partial<AuthorizationDto> = {
  id: 1,
  idToken: 'TOKEN001',
  idTokenType: IdTokenEnum.ISO14443,
  status: AuthorizationStatusEnum.Accepted,
  realTimeAuth: null as any,
  language1: 'fr',
  additionalInfo: [
    {
      additionalIdToken: 'CONTRACT001',
      type: OCPP2_0_1.IdTokenEnumType.eMAID,
    },
    { additionalIdToken: 'VIS001', type: 'visual_number' },
    { additionalIdToken: 'IssuerCo', type: 'issuer' },
  ] as any,
  updatedAt: new Date('2024-06-01T00:00:00Z'),
  tenantPartner: {
    id: 5,
    countryCode: 'FR',
    partyId: 'TMS',
  } as any,
  groupAuthorization: undefined,
};

describe('TokensMapper', () => {
  describe('toDto (Authorization -> TokenDTO)', () => {
    it('should map an RFID authorization to a TokenDTO', () => {
      const result = TokensMapper.toDto(mockAuthorization as AuthorizationDto);

      expect(result.uid).toBe('TOKEN001');
      expect(result.country_code).toBe('FR');
      expect(result.party_id).toBe('TMS');
      expect(result.type).toBe(TokenType.RFID);
      expect(result.contract_id).toBe('CONTRACT001');
      expect(result.visual_number).toBe('VIS001');
      expect(result.issuer).toBe('IssuerCo');
      expect(result.valid).toBe(true);
      expect(result.whitelist).toBe(WhitelistType.ALWAYS);
      expect(result.language).toBe('fr');
      expect(result.last_updated).toEqual(new Date('2024-06-01T00:00:00Z'));
    });

    it('should map an APP_USER authorization', () => {
      const appUserAuth = {
        ...mockAuthorization,
        idTokenType: IdTokenEnum.Central,
      };
      const result = TokensMapper.toDto(appUserAuth as AuthorizationDto);

      expect(result.type).toBe(TokenType.APP_USER);
    });

    it('should map an AD_HOC_USER authorization', () => {
      const adHocAuth = {
        ...mockAuthorization,
        idTokenType: IdTokenEnum.Local,
      };
      const result = TokensMapper.toDto(adHocAuth as AuthorizationDto);

      expect(result.type).toBe(TokenType.AD_HOC_USER);
    });

    it('should map valid=false when status is not Accepted', () => {
      const blockedAuth = {
        ...mockAuthorization,
        status: AuthorizationStatusEnum.Blocked,
      };
      const result = TokensMapper.toDto(blockedAuth as AuthorizationDto);

      expect(result.valid).toBe(false);
    });

    it('should map group_id when groupAuthorization is present', () => {
      const withGroup = {
        ...mockAuthorization,
        groupAuthorization: { idToken: 'GROUP001' },
      };
      const result = TokensMapper.toDto(withGroup as AuthorizationDto);

      expect(result.group_id).toBe('GROUP001');
    });
  });

  describe('mapOcpiTokenTypeToOcppIdTokenType', () => {
    it('should map RFID to ISO14443', () => {
      expect(
        TokensMapper.mapOcpiTokenTypeToOcppIdTokenType(TokenType.RFID),
      ).toBe(IdTokenEnum.ISO14443);
    });

    it('should map AD_HOC_USER to Local', () => {
      expect(
        TokensMapper.mapOcpiTokenTypeToOcppIdTokenType(TokenType.AD_HOC_USER),
      ).toBe(IdTokenEnum.Local);
    });

    it('should map APP_USER to Central', () => {
      expect(
        TokensMapper.mapOcpiTokenTypeToOcppIdTokenType(TokenType.APP_USER),
      ).toBe(IdTokenEnum.Central);
    });

    it('should map OTHER to Other', () => {
      expect(
        TokensMapper.mapOcpiTokenTypeToOcppIdTokenType(TokenType.OTHER),
      ).toBe(IdTokenEnum.Other);
    });
  });

  describe('mapOcppIdTokenTypeToOcpiTokenType', () => {
    it('should map ISO14443 to RFID', () => {
      expect(
        TokensMapper.mapOcppIdTokenTypeToOcpiTokenType(IdTokenEnum.ISO14443),
      ).toBe(TokenType.RFID);
    });

    it('should map Local to AD_HOC_USER', () => {
      expect(
        TokensMapper.mapOcppIdTokenTypeToOcpiTokenType(IdTokenEnum.Local),
      ).toBe(TokenType.AD_HOC_USER);
    });

    it('should map Central to APP_USER', () => {
      expect(
        TokensMapper.mapOcppIdTokenTypeToOcpiTokenType(IdTokenEnum.Central),
      ).toBe(TokenType.APP_USER);
    });

    it('should map null to OTHER', () => {
      expect(TokensMapper.mapOcppIdTokenTypeToOcpiTokenType(null)).toBe(
        TokenType.OTHER,
      );
    });
  });

  describe('mapRealTimeEnumType', () => {
    it('should map Allowed to ALLOWED', () => {
      expect(
        TokensMapper.mapRealTimeEnumType(AuthorizationWhitelistEnum.Allowed),
      ).toBe(WhitelistType.ALLOWED);
    });

    it('should map AllowedOffline to ALLOWED_OFFLINE', () => {
      expect(
        TokensMapper.mapRealTimeEnumType(
          AuthorizationWhitelistEnum.AllowedOffline,
        ),
      ).toBe(WhitelistType.ALLOWED_OFFLINE);
    });

    it('should map Never to NEVER', () => {
      expect(
        TokensMapper.mapRealTimeEnumType(AuthorizationWhitelistEnum.Never),
      ).toBe(WhitelistType.NEVER);
    });

    it('should default to ALWAYS for null/undefined', () => {
      expect(TokensMapper.mapRealTimeEnumType(null)).toBe(WhitelistType.ALWAYS);
      expect(TokensMapper.mapRealTimeEnumType(undefined)).toBe(
        WhitelistType.ALWAYS,
      );
    });
  });

  describe('mapWhitelistType', () => {
    it('should map ALLOWED to Allowed', () => {
      expect(TokensMapper.mapWhitelistType(WhitelistType.ALLOWED)).toBe(
        AuthorizationWhitelistEnum.Allowed,
      );
    });

    it('should map ALLOWED_OFFLINE to AllowedOffline', () => {
      expect(TokensMapper.mapWhitelistType(WhitelistType.ALLOWED_OFFLINE)).toBe(
        AuthorizationWhitelistEnum.AllowedOffline,
      );
    });

    it('should map NEVER to Never', () => {
      expect(TokensMapper.mapWhitelistType(WhitelistType.NEVER)).toBe(
        AuthorizationWhitelistEnum.Never,
      );
    });

    it('should map ALWAYS to null', () => {
      expect(TokensMapper.mapWhitelistType(WhitelistType.ALWAYS)).toBeNull();
    });

    it('should return undefined for undefined input', () => {
      expect(TokensMapper.mapWhitelistType(undefined)).toBeUndefined();
    });
  });

  describe('mapOcpiTokenToPartialOcppAuthorization', () => {
    it('should map a full TokenDTO to partial authorization', () => {
      const tokenDto = {
        country_code: 'FR',
        party_id: 'TMS',
        uid: 'TOKEN001',
        type: TokenType.RFID,
        contract_id: 'CONTRACT001',
        visual_number: 'VIS001',
        issuer: 'IssuerCo',
        valid: true,
        whitelist: WhitelistType.ALLOWED,
        language: 'fr',
        last_updated: new Date(),
      };

      const result =
        TokensMapper.mapOcpiTokenToPartialOcppAuthorization(tokenDto);

      expect(result.idToken).toBe('TOKEN001');
      expect(result.idTokenType).toBe(IdTokenEnum.ISO14443);
      expect(result.status).toBe(AuthorizationStatusEnum.Accepted);
      expect(result.language1).toBe('fr');
      expect(result.realTimeAuth).toBe(AuthorizationWhitelistEnum.Allowed);
      expect(result.additionalInfo).toBeDefined();
      expect(result.additionalInfo).toHaveLength(3);
    });

    it('should map valid=false to Invalid status', () => {
      const tokenDto = {
        uid: 'TOKEN002',
        type: TokenType.RFID,
        contract_id: 'C002',
        issuer: 'Iss',
        valid: false,
        whitelist: WhitelistType.ALWAYS,
        last_updated: new Date(),
      };

      const result =
        TokensMapper.mapOcpiTokenToPartialOcppAuthorization(tokenDto);

      expect(result.status).toBe(AuthorizationStatusEnum.Invalid);
    });

    it('should handle partial DTO without optional fields', () => {
      const partialDto = {
        valid: true,
        last_updated: new Date(),
      };

      const result =
        TokensMapper.mapOcpiTokenToPartialOcppAuthorization(partialDto);

      expect(result.idToken).toBeUndefined();
      expect(result.idTokenType).toBeUndefined();
      expect(result.additionalInfo).toBeUndefined();
    });
  });

  describe('round-trip mapping', () => {
    it('should preserve key fields through toDto -> mapOcpiTokenToPartialOcppAuthorization', () => {
      const tokenDto = TokensMapper.toDto(
        mockAuthorization as AuthorizationDto,
      );
      const partialAuth =
        TokensMapper.mapOcpiTokenToPartialOcppAuthorization(tokenDto);

      expect(partialAuth.idToken).toBe(mockAuthorization.idToken);
      expect(partialAuth.idTokenType).toBe(mockAuthorization.idTokenType);
      expect(partialAuth.status).toBe(AuthorizationStatusEnum.Accepted);
      expect(partialAuth.language1).toBe(mockAuthorization.language1);
    });

    it('should preserve token type through OCPI -> OCPP -> OCPI round trip for RFID, AD_HOC, APP_USER', () => {
      const tokenTypes = [
        TokenType.RFID,
        TokenType.AD_HOC_USER,
        TokenType.APP_USER,
      ];

      for (const type of tokenTypes) {
        const ocppType = TokensMapper.mapOcpiTokenTypeToOcppIdTokenType(type);
        const backToOcpi =
          TokensMapper.mapOcppIdTokenTypeToOcpiTokenType(ocppType);
        expect(backToOcpi).toBe(type);
      }
    });

    it('should map OTHER to IdTokenEnum.Other (one-way, null maps back to OTHER)', () => {
      const ocppType = TokensMapper.mapOcpiTokenTypeToOcppIdTokenType(
        TokenType.OTHER,
      );
      expect(ocppType).toBe(IdTokenEnum.Other);
      expect(TokensMapper.mapOcppIdTokenTypeToOcpiTokenType(null)).toBe(
        TokenType.OTHER,
      );
    });

    it('should preserve whitelist type through WhitelistType -> RealTimeAuth -> WhitelistType round trip', () => {
      const whitelistTypes = [
        WhitelistType.ALLOWED,
        WhitelistType.ALLOWED_OFFLINE,
        WhitelistType.NEVER,
      ];

      for (const wl of whitelistTypes) {
        const ocppType = TokensMapper.mapWhitelistType(wl);
        const backToOcpi = TokensMapper.mapRealTimeEnumType(ocppType);
        expect(backToOcpi).toBe(wl);
      }
    });
  });
});
