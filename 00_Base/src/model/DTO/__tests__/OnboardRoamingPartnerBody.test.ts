// SPDX-FileCopyrightText: 2026 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import {
  OnboardRoamingPartnerEmspBodySchema,
  OnboardTenantPartnerEmspBodySchema,
} from '../OnboardRoamingPartnerBody';

const identity = {
  ourCountryCode: 'FR',
  ourPartyId: 'ZTA',
  partnerCountryCode: 'FR',
  partnerPartyId: 'HUB',
  roamingPartnerCountryCode: 'FR',
  roamingPartnerPartyId: 'TTF',
  roamingPartnerName: 'Transports Test Florianne',
  roamingPartnerSignatureDate: '2026-01-15',
  roamingPartnerContractStartDate: '2026-02-01',
};

const billing = {
  paymentConditions: '30_days',
  emails: [
    'compta@transports-demo.example',
    'facturation@transports-demo.example',
  ],
  billingAddress: {
    address: "12 rue de l'Exemple",
    postalCode: '69003',
    city: 'Lyon',
    countryAlpha2: 'FR',
  },
  vatNumber: 'FR32123456789',
  regNo: '123456789',
  phone: '+33 4 00 00 00 00',
  recipient: 'Service Comptabilité',
  billingIban: 'FR7630006000011234567890189',
  notes: 'Fake customer created for local testing',
  billingLanguage: 'fr_FR',
};

const validBody = { ...identity, ...billing };

const issuePaths = (body: unknown) => {
  const result = OnboardRoamingPartnerEmspBodySchema.safeParse(body);
  return result.success
    ? []
    : result.error.issues.map((issue) => issue.path.join('.'));
};

describe('OnboardRoamingPartnerEmspBodySchema', () => {
  it('accepts a full body without reference fields', () => {
    expect(issuePaths(validBody)).toEqual([]);
  });

  it('accepts the optional reference fields', () => {
    expect(
      issuePaths({
        ...validBody,
        reference: 'ACME-001',
        externalReference: 'patterm-company-1234',
      }),
    ).toEqual([]);
  });

  it.each(Object.keys(billing))('requires %s', (field) => {
    const body: Record<string, unknown> = { ...validBody };
    delete body[field];

    expect(issuePaths(body)).toEqual([field]);
  });

  it.each(['address', 'postalCode', 'city', 'countryAlpha2'])(
    'requires billingAddress.%s',
    (field) => {
      const billingAddress: Record<string, unknown> = {
        ...billing.billingAddress,
      };
      delete billingAddress[field];

      expect(issuePaths({ ...validBody, billingAddress })).toEqual([
        `billingAddress.${field}`,
      ]);
    },
  );

  it.each([
    ['paymentConditions', '45_days'],
    ['emails', []],
    ['emails', ['not-an-email']],
    ['vatNumber', '32123456789'],
    ['phone', 'call me'],
    ['billingIban', 'FR76 3000 6000 0112 3456 7890 189'],
    ['billingLanguage', 'fr'],
    ['notes', '   '],
  ])('rejects an invalid %s (%j)', (field, value) => {
    expect(issuePaths({ ...validBody, [field]: value })[0]).toMatch(
      new RegExp(`^${field}`),
    );
  });

  it('still requires the roaming partner identity', () => {
    const { roamingPartnerName: _omitted, ...body } = validBody;

    expect(issuePaths(body)).toEqual(['roamingPartnerName']);
  });
});

describe('OnboardTenantPartnerEmspBodySchema', () => {
  const tenantBody = {
    ourCountryCode: 'FR',
    ourPartyId: 'ZET',
    partnerCountryCode: 'FR',
    partnerPartyId: 'MSP',
    tenantPartnerName: 'Transports Test Florianne',
    ...billing,
  };

  const tenantIssuePaths = (body: unknown) => {
    const result = OnboardTenantPartnerEmspBodySchema.safeParse(body);
    return result.success
      ? []
      : result.error.issues.map((issue) => issue.path.join('.'));
  };

  it('accepts the tenant partner identity + billing, without any roaming partner field', () => {
    expect(tenantIssuePaths(tenantBody)).toEqual([]);
  });

  it.each([
    'ourCountryCode',
    'ourPartyId',
    'partnerCountryCode',
    'partnerPartyId',
    'tenantPartnerName',
    ...Object.keys(billing),
  ])('requires %s', (field) => {
    const body: Record<string, unknown> = { ...tenantBody };
    delete body[field];

    expect(tenantIssuePaths(body)).toEqual([field]);
  });

  it('applies the same billing rules as the roaming partner body', () => {
    expect(
      tenantIssuePaths({ ...tenantBody, paymentConditions: '45_days' }),
    ).toEqual(['paymentConditions']);
  });
});
