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
    OnboardTenantPartnerEmspBodySchema: {
      safeParse: (data: unknown) => ({ success: true, data }),
    },
    OnboardTenantPartnerEmspBodySchemaName:
      'OnboardTenantPartnerEmspBodySchema',
    OcpiResponseStatusCode: { GenericSuccessCode: 1000 },
    DEFAULT_LIMIT: 10,
    DEFAULT_OFFSET: 0,
    GET_ALL_TENANT_PARTNERS: 'GET_ALL_TENANT_PARTNERS',
    GET_TENANT_PARTNER_BY_ID: 'GET_TENANT_PARTNER_BY_ID',
    GET_TENANT_PARTNER_BY_OUR_AND_PARTNER_IDENTITY:
      'GET_TENANT_PARTNER_BY_OUR_AND_PARTNER_IDENTITY',
    NotFoundException: class NotFoundException extends Error {},
    InvalidParamException: class InvalidParamException extends Error {},
    UnsuccessfulRequestException: class UnsuccessfulRequestException extends Error {
      statusCode?: number;
      code?: string;
      constructor(
        message: string,
        _iRestResponse?: unknown,
        upstream?: { statusCode?: number; code?: string },
      ) {
        super(message);
        this.statusCode = upstream?.statusCode;
        this.code = upstream?.code;
      }
    },
    PENNYLANE_PARTNER_ALREADY_LINKED: 'ocpi_partner_already_linked',
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

import { UnsuccessfulRequestException } from '@citrineos/ocpi-base';
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

const billing = {
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

const emspBody = { ...body, ...billing };

const flushBackgroundWork = () =>
  new Promise((resolve) => setImmediate(resolve));

describe('AdminModuleApi roaming partner routes', () => {
  let api: AdminModuleApi;
  let logger: { info: jest.Mock; error: jest.Mock };
  let upsertRoamingPartner: jest.Mock;
  let pullPartnerTariffs: jest.Mock;
  let pullPartnerLocations: jest.Mock;
  let createCompanyCustomer: jest.Mock;
  let graphqlRequest: jest.Mock;

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
    createCompanyCustomer = jest.fn().mockResolvedValue({
      customer: { id: 7, name: 'ABC Mobility' },
      created: true,
    });
    graphqlRequest = jest.fn();
    api = new AdminModuleApi(
      logger as any,
      { upsertRoamingPartner } as any,
      { pullPartnerTariffs } as any,
      { PullPartnerLocations: pullPartnerLocations } as any,
      {} as any,
      {} as any,
      { request: graphqlRequest } as any,
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
        pennylaneCustomerId: 7,
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
      'with outcome %s still creates the Pennylane customer',
      async (outcome, upsertStatus) => {
        givenOutcome(outcome);

        await expect(
          api.onboardRoamingPartnerEmsp(emspBody, 'Bearer caller.token'),
        ).resolves.toEqual({
          status: `${upsertStatus}; pennylane customer created`,
          pennylaneCustomerId: 7,
        });
        expect(upsertRoamingPartner).toHaveBeenCalledWith(emspBody, 'EMSP');
        expect(createCompanyCustomer).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'ABC Mobility',
            tenant_partner_id: 2,
            roaming_partner_id: 1,
          }),
          'Bearer caller.token',
        );
      },
    );

    it('reports a linked existing Pennylane customer instead of a created one', async () => {
      givenOutcome('created');
      createCompanyCustomer.mockResolvedValue({
        customer: { id: 9, name: 'ABC Mobility SAS' },
        created: false,
      });

      await expect(api.onboardRoamingPartnerEmsp(emspBody)).resolves.toEqual({
        status: 'roaming partner created; existing pennylane customer linked',
        pennylaneCustomerId: 9,
      });
    });

    it.each([
      ['created', 'roaming partner created'],
      ['role_added', 'role added to existing roaming partner'],
      ['unchanged', 'roaming partner already exists'],
    ] as const)(
      'with outcome %s treats the TS API "partner already linked" 409 as success',
      async (outcome, upsertStatus) => {
        givenOutcome(outcome);
        createCompanyCustomer.mockRejectedValue(
          new UnsuccessfulRequestException('already linked', undefined, {
            statusCode: 409,
            code: 'ocpi_partner_already_linked',
          }),
        );

        await expect(api.onboardRoamingPartnerEmsp(emspBody)).resolves.toEqual({
          status: `${upsertStatus}; pennylane customer already linked`,
        });
        expect(logger.error).not.toHaveBeenCalled();
      },
    );

    it('rejects on a TS API 409 with another code', async () => {
      givenOutcome('unchanged');
      createCompanyCustomer.mockRejectedValue(
        new UnsuccessfulRequestException('customer exists', undefined, {
          statusCode: 409,
          code: 'customer_already_exists',
        }),
      );

      const error = await api
        .onboardRoamingPartnerEmsp(emspBody)
        .catch((e) => e);

      expect(error).toBeInstanceOf(UnsuccessfulRequestException);
      expect(error.message).toBe(
        'roaming partner already exists; pennylane customer creation failed: customer exists',
      );
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('customer_already_exists');
    });

    it('keeps the partner and rejects with the TS API status when the TS API fails', async () => {
      givenOutcome('created');
      createCompanyCustomer.mockRejectedValue(
        new UnsuccessfulRequestException(
          'TS API company customer request failed with status 502: Pennylane is unreachable',
          undefined,
          { statusCode: 502 },
        ),
      );

      const error = await api
        .onboardRoamingPartnerEmsp(emspBody)
        .catch((e) => e);

      expect(error).toBeInstanceOf(UnsuccessfulRequestException);
      expect(error.message).toBe(
        'roaming partner created; pennylane customer creation failed: TS API company customer request failed with status 502: Pennylane is unreachable',
      );
      expect(error.statusCode).toBe(502);
      expect(upsertRoamingPartner).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to create Pennylane customer',
        expect.any(Error),
      );
    });

    it('rejects with UnsuccessfulRequestException when the TS API is not configured', async () => {
      givenOutcome('created');
      createCompanyCustomer.mockRejectedValue(
        new Error('TS API is not configured (set CITRINEOS_OCPI_TSAPI_URL)'),
      );

      const error = await api
        .onboardRoamingPartnerEmsp(emspBody)
        .catch((e) => e);

      expect(error).toBeInstanceOf(UnsuccessfulRequestException);
      expect(error.message).toBe(
        'roaming partner created; pennylane customer creation failed: TS API is not configured (set CITRINEOS_OCPI_TSAPI_URL)',
      );
      expect(error.statusCode).toBeUndefined();
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

  describe('POST /onboard-tenant-partner-emsp', () => {
    const tenantBody = {
      ourCountryCode: 'FR',
      ourPartyId: 'ZTA',
      partnerCountryCode: 'FR',
      partnerPartyId: 'MSP',
      tenantPartnerName: 'MSP Direct',
      ...billing,
    };

    const givenTenantPartner = (rows: { id: number }[]) =>
      graphqlRequest.mockResolvedValue({ TenantPartners: rows });

    it('looks up the tenant partner by OCPI identity', async () => {
      givenTenantPartner([{ id: 5 }]);
      createCompanyCustomer.mockResolvedValue({
        customer: { id: 42, name: 'MSP Direct' },
        created: true,
      });

      await api.onboardTenantPartnerEmsp(tenantBody);

      expect(graphqlRequest).toHaveBeenCalledWith(
        'GET_TENANT_PARTNER_BY_OUR_AND_PARTNER_IDENTITY',
        {
          ourCountryCode: 'FR',
          ourPartyId: 'ZTA',
          partnerCountryCode: 'FR',
          partnerPartyId: 'MSP',
        },
      );
    });

    it('creates the Pennylane customer linked to the tenant partner only, forwarding the token', async () => {
      givenTenantPartner([{ id: 5 }]);
      createCompanyCustomer.mockResolvedValue({
        customer: { id: 42, name: 'MSP Direct' },
        created: true,
      });

      await expect(
        api.onboardTenantPartnerEmsp(tenantBody, 'Bearer caller.token'),
      ).resolves.toEqual({
        status: 'pennylane customer created',
        pennylaneCustomerId: 42,
      });

      const [payload, authorization] = createCompanyCustomer.mock.calls[0];
      expect(payload).toEqual(
        expect.objectContaining({
          name: 'MSP Direct',
          payment_conditions: '30_days',
          vat_number: 'FR12345678901',
          tenant_partner_id: 5,
        }),
      );
      expect(payload).not.toHaveProperty('roaming_partner_id');
      expect(authorization).toBe('Bearer caller.token');
    });

    it('reports a linked existing Pennylane customer instead of a created one', async () => {
      givenTenantPartner([{ id: 5 }]);
      createCompanyCustomer.mockResolvedValue({
        customer: { id: 43, name: 'MSP Direct SAS' },
        created: false,
      });

      await expect(api.onboardTenantPartnerEmsp(tenantBody)).resolves.toEqual({
        status: 'existing pennylane customer linked',
        pennylaneCustomerId: 43,
      });
    });

    it('rejects with NotFoundException and does not call the TS API when the tenant partner does not exist', async () => {
      givenTenantPartner([]);

      await expect(api.onboardTenantPartnerEmsp(tenantBody)).rejects.toThrow(
        /Tenant partner FR-MSP not found for FR-ZTA/,
      );
      expect(createCompanyCustomer).not.toHaveBeenCalled();
    });

    it('returns the TS API failure to the caller', async () => {
      givenTenantPartner([{ id: 5 }]);
      createCompanyCustomer.mockRejectedValue(new Error('ts api 409'));

      await expect(api.onboardTenantPartnerEmsp(tenantBody)).rejects.toThrow(
        'ts api 409',
      );
    });

    it('never creates or updates a roaming partner, nor pulls partner data', async () => {
      givenTenantPartner([{ id: 5 }]);
      createCompanyCustomer.mockResolvedValue({
        customer: { id: 42, name: 'MSP Direct' },
        created: true,
      });

      await api.onboardTenantPartnerEmsp(tenantBody);
      await flushBackgroundWork();

      expect(upsertRoamingPartner).not.toHaveBeenCalled();
      expect(pullPartnerTariffs).not.toHaveBeenCalled();
      expect(pullPartnerLocations).not.toHaveBeenCalled();
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
