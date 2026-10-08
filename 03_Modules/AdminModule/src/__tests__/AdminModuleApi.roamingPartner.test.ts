// SPDX-FileCopyrightText: 2026 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

// The controller is exercised directly (no HTTP layer), so the base package's
// decorators and heavy runtime are stubbed out.
jest.mock('@citrineos/ocpi-base', () => {
  const noopDecorator = () => () => undefined;
  const stubClass = () => class {};
  return {
    AsAdminEndpoint: noopDecorator,
    BodyWithSchema: noopDecorator,
    Paginated: noopDecorator,
    BaseController: class {},
    OnboardRoamingPartnerBodySchema: {},
    OnboardRoamingPartnerBodySchemaName: 'OnboardRoamingPartnerBodySchema',
    // Validation is covered by the schema itself; the controller test only
    // checks routing, so the stub accepts any body as-is.
    OnboardRoamingPartnerEmspBodySchema: {
      safeParse: (data: unknown) => ({ success: true, data }),
    },
    OnboardRoamingPartnerEmspBodySchemaName:
      'OnboardRoamingPartnerEmspBodySchema',
    OcpiResponseStatusCode: { GenericSuccessCode: 1000 },
    DEFAULT_LIMIT: 10,
    DEFAULT_OFFSET: 0,
    GET_ALL_TENANT_PARTNERS: 'GET_ALL_TENANT_PARTNERS',
    GET_TENANT_PARTNER_BY_ID: 'GET_TENANT_PARTNER_BY_ID',
    NotFoundException: class NotFoundException extends Error {},
    InvalidParamException: class InvalidParamException extends Error {},
    OcpiHeaders: class {},
    OcpiLogger: stubClass(),
    OcpiGraphqlClient: stubClass(),
    RoamingPartnerService: stubClass(),
    PennylaneService: stubClass(),
    TariffsService: stubClass(),
    LocationsPullService: stubClass(),
    SessionsService: stubClass(),
    CdrsService: stubClass(),
  };
});

import { AdminModuleApi } from '../module/AdminModuleApi.js';

type Outcome = 'created' | 'role_added' | 'unchanged';

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

const emspBody = {
  ...body,
  paymentConditions: '30_days' as const,
  emails: ['compta@acme-transports.fr'],
  billingAddress: {
    address: '12 rue de la Gare',
    postalCode: '21190',
    city: 'Meursault',
    countryAlpha2: 'FR',
  },
  vatNumber: 'FR12345678901',
  regNo: '123456789',
  phone: '+33380000000',
  recipient: 'Service comptabilite',
  billingIban: 'FR7630006000011234567890189',
  notes: 'Created from Patterm',
  billingLanguage: 'fr_FR',
  reference: 'ACME-001',
  externalReference: 'patterm-company-1234',
};

const flushBackgroundWork = () =>
  new Promise((resolve) => setImmediate(resolve));

describe('AdminModuleApi roaming partner routes', () => {
  let api: AdminModuleApi;
  let logger: { info: jest.Mock; error: jest.Mock };
  let upsertRoamingPartner: jest.Mock;
  let pullPartnerTariffs: jest.Mock;
  let pullPartnerLocations: jest.Mock;
  let createCompanyCustomer: jest.Mock;

  const givenOutcome = (outcome: Outcome) =>
    upsertRoamingPartner.mockResolvedValue({
      id: 1,
      tenantPartnerId: 2,
      outcome,
    });

  beforeEach(() => {
    logger = { info: jest.fn(), error: jest.fn() };
    upsertRoamingPartner = jest.fn();
    pullPartnerTariffs = jest.fn().mockResolvedValue({ processed: 3 });
    pullPartnerLocations = jest.fn().mockResolvedValue({ processed: 5 });
    createCompanyCustomer = jest.fn().mockResolvedValue({});
    api = new AdminModuleApi(
      logger as any,
      { upsertRoamingPartner } as any,
      { pullPartnerTariffs } as any,
      { PullPartnerLocations: pullPartnerLocations } as any,
      {} as any,
      {} as any,
      {} as any,
      { createCompanyCustomer } as any,
    );
  });

  describe('POST /create-roaming-partner-cpo', () => {
    it.each([
      ['created', 'roaming partner created'],
      ['role_added', 'role added to existing roaming partner'],
      ['unchanged', 'roaming partner already exists'],
    ] as const)('with outcome %s returns "%s"', async (outcome, status) => {
      givenOutcome(outcome);

      await expect(api.createRoamingPartnerCpo(body)).resolves.toEqual({
        status,
      });
      expect(upsertRoamingPartner).toHaveBeenCalledWith(body, 'CPO');
    });

    it('does not pull any partner data', async () => {
      givenOutcome('created');

      await api.createRoamingPartnerCpo(body);
      await flushBackgroundWork();

      expect(pullPartnerTariffs).not.toHaveBeenCalled();
      expect(pullPartnerLocations).not.toHaveBeenCalled();
    });

    it('rejects when the service rejects', async () => {
      upsertRoamingPartner.mockRejectedValue(new Error('conflict'));

      await expect(api.createRoamingPartnerCpo(body)).rejects.toThrow(
        'conflict',
      );
    });
  });

  describe('POST /create-roaming-partner-emsp', () => {
    it.each([
      ['created', 'roaming partner created'],
      ['role_added', 'role added to existing roaming partner'],
      ['unchanged', 'roaming partner already exists'],
    ] as const)('with outcome %s returns "%s"', async (outcome, status) => {
      givenOutcome(outcome);

      await expect(api.createRoamingPartnerEmsp(body)).resolves.toEqual({
        status,
      });
      expect(upsertRoamingPartner).toHaveBeenCalledWith(body, 'EMSP');
    });

    it('does not pull any partner data', async () => {
      givenOutcome('created');

      await api.createRoamingPartnerEmsp(body);
      await flushBackgroundWork();

      expect(pullPartnerTariffs).not.toHaveBeenCalled();
      expect(pullPartnerLocations).not.toHaveBeenCalled();
    });

    it('rejects when the service rejects', async () => {
      upsertRoamingPartner.mockRejectedValue(new Error('conflict'));

      await expect(api.createRoamingPartnerEmsp(body)).rejects.toThrow(
        'conflict',
      );
    });
  });

  describe('POST /onboard-roaming-partner-cpo', () => {
    it.each(['created', 'role_added'] as const)(
      'with outcome %s returns accepted and pulls tariffs then locations',
      async (outcome) => {
        givenOutcome(outcome);

        await expect(api.onboardRoamingPartnerCpo(body)).resolves.toEqual({
          status: 'accepted',
        });
        await flushBackgroundWork();

        expect(upsertRoamingPartner).toHaveBeenCalledWith(body, 'CPO');
        expect(pullPartnerTariffs).toHaveBeenCalledWith({
          ourCountryCode: 'FR',
          ourPartyId: 'ZTA',
          partnerCountryCode: 'FR',
          partnerPartyId: 'HUB',
          roamingPartnerCountryCode: 'DE',
          roamingPartnerPartyId: 'ABC',
          offset: 0,
          limit: 100,
        });
        expect(pullPartnerLocations).toHaveBeenCalledWith({
          ourCountryCode: 'FR',
          ourPartyId: 'ZTA',
          partnerCountryCode: 'FR',
          partnerPartyId: 'HUB',
          roamingPartnerCountryCode: 'DE',
          roamingPartnerPartyId: 'ABC',
          offset: 0,
          limit: 20,
        });
        expect(pullPartnerTariffs.mock.invocationCallOrder[0]).toBeLessThan(
          pullPartnerLocations.mock.invocationCallOrder[0],
        );
      },
    );

    it('with outcome unchanged returns "already onboarded" and does not pull', async () => {
      givenOutcome('unchanged');

      await expect(api.onboardRoamingPartnerCpo(body)).resolves.toEqual({
        status: 'already onboarded',
      });
      await flushBackgroundWork();

      expect(pullPartnerTariffs).not.toHaveBeenCalled();
      expect(pullPartnerLocations).not.toHaveBeenCalled();
    });

    it('rejects and does not pull when the service rejects', async () => {
      upsertRoamingPartner.mockRejectedValue(new Error('conflict'));

      await expect(api.onboardRoamingPartnerCpo(body)).rejects.toThrow(
        'conflict',
      );
      await flushBackgroundWork();

      expect(pullPartnerTariffs).not.toHaveBeenCalled();
      expect(pullPartnerLocations).not.toHaveBeenCalled();
    });

    it('still returns accepted and logs when the background pull fails', async () => {
      givenOutcome('created');
      pullPartnerTariffs.mockRejectedValue(new Error('hub down'));

      await expect(api.onboardRoamingPartnerCpo(body)).resolves.toEqual({
        status: 'accepted',
      });
      await flushBackgroundWork();

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to pull partner data',
        expect.any(Error),
      );
      expect(pullPartnerLocations).not.toHaveBeenCalled();
    });
  });

  describe('POST /onboard-roaming-partner-emsp', () => {
    it('with outcome created registers the partner and creates the Pennylane customer with the snake_case TS API payload', async () => {
      givenOutcome('created');

      await expect(
        api.onboardRoamingPartnerEmsp(emspBody, 'Bearer caller.token'),
      ).resolves.toEqual({
        status: 'roaming partner created; pennylane customer created',
      });
      expect(upsertRoamingPartner).toHaveBeenCalledWith(emspBody, 'EMSP');
      expect(createCompanyCustomer).toHaveBeenCalledTimes(1);
      expect(createCompanyCustomer).toHaveBeenCalledWith(
        {
          name: 'ABC Mobility',
          payment_conditions: '30_days',
          emails: ['compta@acme-transports.fr'],
          billing_address: {
            address: '12 rue de la Gare',
            postal_code: '21190',
            city: 'Meursault',
            country_alpha2: 'FR',
          },
          vat_number: 'FR12345678901',
          reg_no: '123456789',
          phone: '+33380000000',
          recipient: 'Service comptabilite',
          billing_iban: 'FR7630006000011234567890189',
          notes: 'Created from Patterm',
          billing_language: 'fr_FR',
          reference: 'ACME-001',
          external_reference: 'patterm-company-1234',
          tenant_partner_id: 2,
          roaming_partner_id: 1,
        },
        'Bearer caller.token',
      );
    });

    it.each([
      ['role_added', 'role added to existing roaming partner'],
      ['unchanged', 'roaming partner already exists'],
    ] as const)(
      'with outcome %s does not call the TS API and returns "%s"',
      async (outcome, status) => {
        givenOutcome(outcome);

        await expect(api.onboardRoamingPartnerEmsp(emspBody)).resolves.toEqual({
          status,
        });
        expect(upsertRoamingPartner).toHaveBeenCalledWith(emspBody, 'EMSP');
        expect(createCompanyCustomer).not.toHaveBeenCalled();
      },
    );

    it('keeps the partner and reports the failure when the TS API call fails', async () => {
      givenOutcome('created');
      createCompanyCustomer.mockRejectedValue(new Error('ts api down'));

      await expect(api.onboardRoamingPartnerEmsp(emspBody)).resolves.toEqual({
        status: 'roaming partner created; pennylane customer creation failed',
      });
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to create Pennylane customer',
        expect.any(Error),
      );
    });

    it('does not run the CPO tariffs/locations pull', async () => {
      givenOutcome('created');

      await api.onboardRoamingPartnerEmsp(emspBody);
      await flushBackgroundWork();

      expect(pullPartnerTariffs).not.toHaveBeenCalled();
      expect(pullPartnerLocations).not.toHaveBeenCalled();
    });

    it('rejects without calling the TS API when the service rejects', async () => {
      upsertRoamingPartner.mockRejectedValue(new Error('conflict'));

      await expect(api.onboardRoamingPartnerEmsp(emspBody)).rejects.toThrow(
        'conflict',
      );
      expect(createCompanyCustomer).not.toHaveBeenCalled();
    });
  });

  it.each([
    ['create-roaming-partner-cpo', 'createRoamingPartnerCpo'],
    ['create-roaming-partner-emsp', 'createRoamingPartnerEmsp'],
    ['onboard-roaming-partner-cpo', 'onboardRoamingPartnerCpo'],
  ] as const)('%s never calls the TS API', async (_route, method) => {
    givenOutcome('created');

    await api[method](body);
    await flushBackgroundWork();

    expect(createCompanyCustomer).not.toHaveBeenCalled();
  });
});
