// SPDX-FileCopyrightText: 2026 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { RoamingPartnerService } from '../RoamingPartnerService';
import { NotFoundException } from '../../exception/NotFoundException';
import { InvalidParamException } from '../../exception/InvalidParamException';
import { GET_TENANT_PARTNER_BY_OUR_AND_PARTNER_IDENTITY } from '../../graphql/queries/tenantPartner.queries';
import {
  CREATE_ROAMING_PARTNER,
  GET_ROAMING_PARTNER_BY_IDENTITY,
  ADD_ROAMING_PARTNER_ROLE,
} from '../../graphql/queries/roamingPartner.queries';

const body = {
  ourCountryCode: 'FR',
  ourPartyId: 'ZTA',
  partnerCountryCode: 'FR',
  partnerPartyId: 'HUB',
  roamingPartnerCountryCode: 'DE',
  roamingPartnerPartyId: 'ABC',
  roamingPartnerName: 'ABC Mobility',
  roamingPartnerSignatureDate: '2026-01-15',
  roamingPartnerContractStartDate: '2026-02-01',
};

const existingRow = {
  id: 42,
  name: 'ABC Mobility',
  signatureDate: '2026-01-15',
  contractStartDate: '2026-02-01',
  roles: ['EMSP'],
};

describe('RoamingPartnerService.upsertRoamingPartner', () => {
  let service: RoamingPartnerService;
  let request: jest.Mock;
  let tenantPartnerRows: unknown[];
  let existingRows: unknown[];
  let appendResult: { affected_rows: number };

  const callsTo = (document: unknown) =>
    request.mock.calls.filter(([doc]) => doc === document);

  beforeEach(() => {
    tenantPartnerRows = [{ id: 7 }];
    existingRows = [];
    appendResult = { affected_rows: 1 };
    request = jest.fn(async (document: unknown) => {
      if (document === GET_TENANT_PARTNER_BY_OUR_AND_PARTNER_IDENTITY) {
        return { TenantPartners: tenantPartnerRows };
      }
      if (document === GET_ROAMING_PARTNER_BY_IDENTITY) {
        return { RoamingPartners: existingRows };
      }
      if (document === CREATE_ROAMING_PARTNER) {
        return { insert_RoamingPartners_one: { id: 99 } };
      }
      if (document === ADD_ROAMING_PARTNER_ROLE) {
        return { append: appendResult };
      }
      throw new Error('unexpected document');
    });
    const logger = { error: jest.fn(), info: jest.fn() } as any;
    service = new RoamingPartnerService(logger, { request } as any);
  });

  describe('input validation', () => {
    it.each([
      ['an empty country code', { roamingPartnerCountryCode: '' }],
      ['a lowercase country code', { roamingPartnerCountryCode: 'de' }],
      ['a 3-letter country code', { roamingPartnerCountryCode: 'DEU' }],
      ['an empty party id', { roamingPartnerPartyId: '' }],
      ['a 2-character party id', { roamingPartnerPartyId: 'AB' }],
      ['a party id with symbols', { roamingPartnerPartyId: 'A-C' }],
      ['an empty name', { roamingPartnerName: '' }],
      ['a blank name', { roamingPartnerName: '   ' }],
      ['a malformed signature date', { roamingPartnerSignatureDate: 'abc' }],
      [
        'a malformed contract start date',
        { roamingPartnerContractStartDate: '01/02/2026' },
      ],
      [
        'a signature date with a time part',
        { roamingPartnerSignatureDate: '2026-01-15T00:00:00.000Z' },
      ],
      [
        'a contract start date with a time part',
        { roamingPartnerContractStartDate: '2026-02-01T10:30:00Z' },
      ],
      [
        'an impossible signature date',
        { roamingPartnerSignatureDate: '2026-02-30' },
      ],
      [
        'an out-of-range contract start date',
        { roamingPartnerContractStartDate: '2026-13-45' },
      ],
    ])('rejects %s before calling Hasura', async (_, override) => {
      await expect(
        service.upsertRoamingPartner({ ...body, ...override }, 'CPO'),
      ).rejects.toThrow(InvalidParamException);
      expect(request).not.toHaveBeenCalled();
    });

    it.each([
      'roamingPartnerCountryCode',
      'roamingPartnerPartyId',
      'roamingPartnerName',
      'roamingPartnerSignatureDate',
      'roamingPartnerContractStartDate',
      'ourCountryCode',
      'partnerPartyId',
    ])('rejects a body missing %s before calling Hasura', async (field) => {
      const incomplete: Record<string, unknown> = { ...body };
      delete incomplete[field];

      await expect(
        service.upsertRoamingPartner(incomplete as typeof body, 'EMSP'),
      ).rejects.toThrow(InvalidParamException);
      expect(request).not.toHaveBeenCalled();
    });

    it('names the offending field in the error message', async () => {
      await expect(
        service.upsertRoamingPartner(
          { ...body, roamingPartnerCountryCode: '' },
          'CPO',
        ),
      ).rejects.toThrow(/roamingPartnerCountryCode/);
    });

    it('accepts a mixed-case alphanumeric party id', async () => {
      const result = await service.upsertRoamingPartner(
        { ...body, roamingPartnerPartyId: 'a1B' },
        'CPO',
      );

      expect(result.outcome).toBe('created');
    });
  });

  it('rejects with NotFoundException when the hub tenant partner is unknown', async () => {
    tenantPartnerRows = [];

    await expect(service.upsertRoamingPartner(body, 'CPO')).rejects.toThrow(
      NotFoundException,
    );
    expect(callsTo(CREATE_ROAMING_PARTNER)).toHaveLength(0);
    expect(callsTo(ADD_ROAMING_PARTNER_ROLE)).toHaveLength(0);
  });

  it('looks the hub up by our and partner identity', async () => {
    await service.upsertRoamingPartner(body, 'CPO');

    expect(
      callsTo(GET_TENANT_PARTNER_BY_OUR_AND_PARTNER_IDENTITY)[0][1],
    ).toEqual({
      ourCountryCode: 'FR',
      ourPartyId: 'ZTA',
      partnerCountryCode: 'FR',
      partnerPartyId: 'HUB',
    });
    expect(callsTo(GET_ROAMING_PARTNER_BY_IDENTITY)[0][1]).toEqual({
      tenantPartnerId: 7,
      countryCode: 'DE',
      partyId: 'ABC',
    });
  });

  describe('when the roaming partner does not exist', () => {
    it.each(['CPO', 'EMSP'] as const)(
      'inserts it with roles [%s] and returns created',
      async (role) => {
        const result = await service.upsertRoamingPartner(body, role);

        expect(result).toEqual({
          id: 99,
          tenantPartnerId: 7,
          outcome: 'created',
        });
        expect(callsTo(CREATE_ROAMING_PARTNER)).toHaveLength(1);
        expect(callsTo(CREATE_ROAMING_PARTNER)[0][1]).toEqual({
          countryCode: 'DE',
          partyId: 'ABC',
          tenantPartnerId: 7,
          name: 'ABC Mobility',
          signatureDate: '2026-01-15',
          contractStartDate: '2026-02-01',
          roles: [role],
        });
        expect(callsTo(ADD_ROAMING_PARTNER_ROLE)).toHaveLength(0);
      },
    );

    it('throws when the insert returns no id', async () => {
      request.mockImplementation(async (document: unknown) => {
        if (document === GET_TENANT_PARTNER_BY_OUR_AND_PARTNER_IDENTITY) {
          return { TenantPartners: tenantPartnerRows };
        }
        if (document === GET_ROAMING_PARTNER_BY_IDENTITY) {
          return { RoamingPartners: [] };
        }
        return { insert_RoamingPartners_one: null };
      });

      await expect(service.upsertRoamingPartner(body, 'CPO')).rejects.toThrow(
        'Failed to create roaming partner',
      );
    });

    it('propagates a Hasura error from the insert', async () => {
      request.mockImplementation(async (document: unknown) => {
        if (document === GET_TENANT_PARTNER_BY_OUR_AND_PARTNER_IDENTITY) {
          return { TenantPartners: tenantPartnerRows };
        }
        if (document === GET_ROAMING_PARTNER_BY_IDENTITY) {
          return { RoamingPartners: [] };
        }
        throw new Error('unique constraint violation');
      });

      await expect(service.upsertRoamingPartner(body, 'CPO')).rejects.toThrow(
        'unique constraint violation',
      );
    });
  });

  describe('when the roaming partner already exists with the same details', () => {
    it('returns unchanged and writes nothing if the role is already present', async () => {
      existingRows = [{ ...existingRow, roles: ['CPO', 'EMSP'] }];

      const result = await service.upsertRoamingPartner(body, 'CPO');

      expect(result).toEqual({
        id: 42,
        tenantPartnerId: 7,
        outcome: 'unchanged',
      });
      expect(callsTo(CREATE_ROAMING_PARTNER)).toHaveLength(0);
      expect(callsTo(ADD_ROAMING_PARTNER_ROLE)).toHaveLength(0);
    });

    it('appends the role and returns role_added if it is missing', async () => {
      existingRows = [existingRow];

      const result = await service.upsertRoamingPartner(body, 'CPO');

      expect(result).toEqual({
        id: 42,
        tenantPartnerId: 7,
        outcome: 'role_added',
      });
      expect(callsTo(ADD_ROAMING_PARTNER_ROLE)).toHaveLength(1);
      expect(callsTo(ADD_ROAMING_PARTNER_ROLE)[0][1]).toEqual({
        id: 42,
        role: 'CPO',
      });
      expect(callsTo(CREATE_ROAMING_PARTNER)).toHaveLength(0);
    });

    it('returns unchanged if the role was added concurrently', async () => {
      existingRows = [existingRow];
      appendResult = { affected_rows: 0 };

      const result = await service.upsertRoamingPartner(body, 'CPO');

      expect(result.outcome).toBe('unchanged');
      expect(callsTo(ADD_ROAMING_PARTNER_ROLE)).toHaveLength(1);
    });

    it('treats null roles as empty', async () => {
      existingRows = [{ ...existingRow, roles: null }];

      const result = await service.upsertRoamingPartner(body, 'EMSP');

      expect(result.outcome).toBe('role_added');
      expect(callsTo(ADD_ROAMING_PARTNER_ROLE)[0][1]).toEqual({
        id: 42,
        role: 'EMSP',
      });
    });
  });

  describe('when the roaming partner exists with different details', () => {
    it.each([
      ['name', { roamingPartnerName: 'Another Name' }],
      ['signature date', { roamingPartnerSignatureDate: '2026-01-16' }],
      [
        'contract start date',
        { roamingPartnerContractStartDate: '2026-03-01' },
      ],
    ])(
      'rejects when the %s differs and does not touch the row',
      async (_, override) => {
        existingRows = [existingRow];

        await expect(
          service.upsertRoamingPartner({ ...body, ...override }, 'CPO'),
        ).rejects.toThrow(InvalidParamException);
        expect(callsTo(CREATE_ROAMING_PARTNER)).toHaveLength(0);
        expect(callsTo(ADD_ROAMING_PARTNER_ROLE)).toHaveLength(0);
      },
    );

    it('rejects even when the role is already present', async () => {
      existingRows = [{ ...existingRow, roles: ['CPO'] }];

      await expect(
        service.upsertRoamingPartner(
          { ...body, roamingPartnerName: 'Another Name' },
          'CPO',
        ),
      ).rejects.toThrow(InvalidParamException);
    });
  });
});
