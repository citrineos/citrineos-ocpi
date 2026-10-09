// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0
import {
  AsAdminEndpoint,
  BaseController,
  BodyWithSchema,
  CdrsService,
  DEFAULT_LIMIT,
  DEFAULT_OFFSET,
  GET_ALL_TENANT_PARTNERS,
  GET_TENANT_PARTNER_BY_ID,
  GET_TENANT_PARTNER_BY_OUR_AND_PARTNER_IDENTITY,
  InvalidParamException,
  LocationsPullService,
  NotFoundException,
  OcpiGraphqlClient,
  OcpiHeaders,
  OcpiLogger,
  OcpiResponseStatusCode,
  OnboardRoamingPartnerBodySchema,
  OnboardRoamingPartnerBodySchemaName,
  OnboardRoamingPartnerEmspBodySchema,
  OnboardRoamingPartnerEmspBodySchemaName,
  OnboardTenantPartnerEmspBodySchema,
  OnboardTenantPartnerEmspBodySchemaName,
  Paginated,
  PaginatedParams,
  PENNYLANE_PARTNER_ALREADY_LINKED,
  PennylaneService,
  SessionsService,
  UnsuccessfulRequestException,
  type GetAllTenantPartnersQueryResult,
  type GetAllTenantPartnersQueryVariables,
  type GetTenantPartnerByIdQueryResult,
  type GetTenantPartnerByCpoClientAndModuleIdQueryResult,
  type GetTenantPartnerByCpoClientAndModuleIdQueryVariables,
  type GetTenantPartnerByIdQueryVariables,
  DeleteLocationBodySchema,
  DeleteLocationBodySchemaName,
  TariffsService,
  LocationsService,
  type OnboardRoamingPartnerBody,
  type DeleteLocationBody,
  type DeleteLocationSummary,
  type OnboardRoamingPartnerEmspBody,
  type OnboardTenantPartnerEmspBody,
  type PennylaneBilling,
  type PennylaneCompanyCustomerRequest,
} from '@citrineos/ocpi-base';
import {
  Get,
  HeaderParam,
  JsonController,
  Param,
  Post,
} from 'routing-controllers';
import { Service } from 'typedi';
import { RoamingPartnerService } from '@citrineos/ocpi-base';

const UPSERT_STATUS = {
  created: 'roaming partner created',
  role_added: 'role added to existing roaming partner',
  unchanged: 'roaming partner already exists',
} as const;

const pennylaneStatus = (created: boolean) =>
  created ? 'pennylane customer created' : 'existing pennylane customer linked';

// BodyWithSchema only feeds the OpenAPI spec, it does not validate requests.
const parseBody = <T>(
  schema: { safeParse: (data: unknown) => any },
  rawBody: unknown,
): T => {
  const parsed = schema.safeParse(rawBody);
  if (!parsed.success) {
    throw new InvalidParamException(
      parsed.error.issues
        .map(
          (issue: { path: (string | number)[]; message: string }) =>
            `${issue.path.join('.')}: ${issue.message}`,
        )
        .join('; '),
    );
  }
  return parsed.data;
};

const toPennylaneCompanyCustomer = (
  name: string,
  body: PennylaneBilling,
): PennylaneCompanyCustomerRequest => ({
  name,
  payment_conditions: body.paymentConditions,
  emails: body.emails,
  billing_address: {
    address: body.billingAddress.address,
    postal_code: body.billingAddress.postalCode,
    city: body.billingAddress.city,
    country_alpha2: body.billingAddress.countryAlpha2,
  },
  vat_number: body.vatNumber,
  reg_no: body.regNo,
  phone: body.phone,
  recipient: body.recipient,
  billing_iban: body.billingIban,
  notes: body.notes,
  billing_language: body.billingLanguage,
  reference: body.reference,
  external_reference: body.externalReference,
});

@JsonController('/admin')
@Service()
export class AdminModuleApi extends BaseController {
  constructor(
    readonly logger: OcpiLogger,
    readonly roamingPartnerService: RoamingPartnerService,
    readonly tariffsService: TariffsService,
    readonly locationsPullService: LocationsPullService,
    readonly sessionsService: SessionsService,
    readonly cdrsService: CdrsService,
    readonly ocpiGraphqlClient: OcpiGraphqlClient,
    readonly locationsService: LocationsService,
    readonly pennylaneService: PennylaneService,
  ) {
    super();
  }

  /**
   * Resolves a TenantPartner id to the OCPI from/to identity needed to call
   * SessionsService/CdrsService directly — no partner credential required,
   * since this is an internal server-side lookup, not an OCPI protocol call.
   */
  private async resolvePartnerHeaders(partnerId: number): Promise<OcpiHeaders> {
    const result = await this.ocpiGraphqlClient.request<
      GetTenantPartnerByIdQueryResult,
      GetTenantPartnerByIdQueryVariables
    >(GET_TENANT_PARTNER_BY_ID, { id: partnerId });

    const partner = result.TenantPartners_by_pk;
    if (!partner?.tenant?.countryCode || !partner.tenant?.partyId) {
      throw new NotFoundException(`Partner ${partnerId} not found`);
    }

    return new OcpiHeaders(
      partner.countryCode,
      partner.partyId,
      partner.tenant.countryCode,
      partner.tenant.partyId,
    );
  }

  /**
   * Projects only the safe identity fields out of partnerProfileOCPI —
   * serverCredentials/credentials never leave this method.
   */
  private toIdentity(row: {
    id: number;
    countryCode: string;
    partyId: string;
    partnerProfileOCPI?: unknown;
  }) {
    const profile = row.partnerProfileOCPI as
      | {
          roles?: Array<{
            role?: string;
            businessDetails?: { name?: string; website?: string };
          }>;
        }
      | null
      | undefined;
    const primaryRole = profile?.roles?.[0];

    return {
      id: row.id,
      countryCode: row.countryCode,
      partyId: row.partyId,
      role: primaryRole?.role ?? 'OTHER',
      businessDetails: primaryRole?.businessDetails ?? null,
    };
  }

  /**
   * Admin UI: partner identity (role/business details) for every partner.
   * Replaces the frontend's direct GraphQL read of partnerProfileOCPI, which
   * also exposed serverCredentials/credentials tokens (SEC-001).
   */
  @Get('/partners')
  @AsAdminEndpoint()
  async listPartners() {
    const result = await this.ocpiGraphqlClient.request<
      GetAllTenantPartnersQueryResult,
      GetAllTenantPartnersQueryVariables
    >(GET_ALL_TENANT_PARTNERS, {});

    return { data: result.TenantPartners.map((row) => this.toIdentity(row)) };
  }

  /**
   * Admin UI: partner identity for a single partner. See listPartners().
   */
  @Get('/partners/:id')
  @AsAdminEndpoint()
  async getPartner(@Param('id') idParam: string) {
    const id = Number(idParam);
    if (!Number.isInteger(id)) {
      throw new NotFoundException(`Partner ${idParam} not found`);
    }

    const result = await this.ocpiGraphqlClient.request<
      GetTenantPartnerByIdQueryResult,
      GetTenantPartnerByIdQueryVariables
    >(GET_TENANT_PARTNER_BY_ID, { id });

    const partner = result.TenantPartners_by_pk;
    if (!partner) {
      throw new NotFoundException(`Partner ${id} not found`);
    }

    return { data: this.toIdentity(partner) };
  }

  /**
   * Admin UI: sessions we hold for a given partner, resolved server-side.
   * Never exposes the partner's serverCredentials.token to the caller.
   */
  @Get('/partners/:id/sessions')
  @AsAdminEndpoint()
  async getPartnerSessions(
    @Param('id') idParam: string,
    @Paginated() paginatedParams?: PaginatedParams,
  ) {
    const id = Number(idParam);
    if (!Number.isInteger(id)) {
      throw new NotFoundException(`Partner ${idParam} not found`);
    }

    const ocpiHeaders = await this.resolvePartnerHeaders(id);
    const { data, count } = await this.sessionsService.getSessions(
      ocpiHeaders,
      paginatedParams,
    );

    return {
      data,
      total: count,
      offset: paginatedParams?.offset ?? DEFAULT_OFFSET,
      limit: paginatedParams?.limit ?? DEFAULT_LIMIT,
      status_code: OcpiResponseStatusCode.GenericSuccessCode,
      timestamp: new Date(),
    };
  }

  /**
   * Admin UI: CDRs we hold for a given partner, resolved server-side.
   * Never exposes the partner's serverCredentials.token to the caller.
   */
  @Get('/partners/:id/cdrs')
  @AsAdminEndpoint()
  async getPartnerCdrs(
    @Param('id') idParam: string,
    @Paginated() paginatedParams?: PaginatedParams,
  ) {
    const id = Number(idParam);
    if (!Number.isInteger(id)) {
      throw new NotFoundException(`Partner ${idParam} not found`);
    }

    const ocpiHeaders = await this.resolvePartnerHeaders(id);
    const result = await this.cdrsService.getCdrs(
      ocpiHeaders.fromCountryCode,
      ocpiHeaders.fromPartyId,
      ocpiHeaders.toCountryCode,
      ocpiHeaders.toPartyId,
      paginatedParams?.dateFrom,
      paginatedParams?.dateTo,
      paginatedParams?.offset,
      paginatedParams?.limit,
    );

    return {
      ...result,
      status_code: OcpiResponseStatusCode.GenericSuccessCode,
      timestamp: new Date(),
    };
  }

  @Post('/onboard-roaming-partner-cpo')
  @AsAdminEndpoint()
  async onboardRoamingPartnerCpo(
    @BodyWithSchema(
      OnboardRoamingPartnerBodySchema,
      OnboardRoamingPartnerBodySchemaName,
    )
    body: OnboardRoamingPartnerBody,
  ): Promise<{ status: string }> {
    const { outcome } = await this.roamingPartnerService.upsertRoamingPartner(
      body,
      'CPO',
    );
    if (outcome === 'unchanged') {
      return { status: 'already onboarded' };
    }
    const pullBody = {
      ourCountryCode: body.ourCountryCode,
      ourPartyId: body.ourPartyId,
      partnerCountryCode: body.partnerCountryCode,
      partnerPartyId: body.partnerPartyId,
      roamingPartnerCountryCode: body.roamingPartnerCountryCode,
      roamingPartnerPartyId: body.roamingPartnerPartyId,
      offset: 0,
      limit: 20,
    };

    void (async () => {
      try {
        const tariffs = await this.tariffsService.pullPartnerTariffs({
          ...pullBody,
          offset: 0,
          limit: 100,
        });
        this.logger.info('Tariffs pull completed', tariffs);

        const locations = await this.locationsPullService.PullPartnerLocations({
          ...pullBody,
          offset: 0,
          limit: 20,
        });
        this.logger.info('Locations pull completed', locations);
      } catch (err) {
        this.logger.error('Failed to pull partner data', err);
      }
    })();

    return { status: 'accepted' };
  }

  @Post('/create-roaming-partner-cpo')
  @AsAdminEndpoint()
  async createRoamingPartnerCpo(
    @BodyWithSchema(
      OnboardRoamingPartnerBodySchema,
      OnboardRoamingPartnerBodySchemaName,
    )
    body: OnboardRoamingPartnerBody,
  ): Promise<{ status: string }> {
    const { outcome } = await this.roamingPartnerService.upsertRoamingPartner(
      body,
      'CPO',
    );
    return { status: UPSERT_STATUS[outcome] };
  }

  @Post('/create-roaming-partner-emsp')
  @AsAdminEndpoint()
  async createRoamingPartnerEmsp(
    @BodyWithSchema(
      OnboardRoamingPartnerBodySchema,
      OnboardRoamingPartnerBodySchemaName,
    )
    body: OnboardRoamingPartnerBody,
  ): Promise<{ status: string }> {
    const { outcome } = await this.roamingPartnerService.upsertRoamingPartner(
      body,
      'EMSP',
    );
    return { status: UPSERT_STATUS[outcome] };
  }

  @Post('/onboard-roaming-partner-emsp')
  @AsAdminEndpoint()
  async onboardRoamingPartnerEmsp(
    @BodyWithSchema(
      OnboardRoamingPartnerEmspBodySchema,
      OnboardRoamingPartnerEmspBodySchemaName,
    )
    rawBody: OnboardRoamingPartnerEmspBody,
    // Forwarded to the TS API, which trusts the same Keycloak realm.
    @HeaderParam('authorization') authorization?: string,
  ): Promise<{ status: string; pennylaneCustomerId?: number }> {
    // Validate before the upsert so a bad billing body never leaves a partner
    // without its Pennylane customer.
    const body = parseBody<OnboardRoamingPartnerEmspBody>(
      OnboardRoamingPartnerEmspBodySchema,
      rawBody,
    );

    const { id, tenantPartnerId, outcome } =
      await this.roamingPartnerService.upsertRoamingPartner(body, 'EMSP');

    // Called for every outcome: the TS API is idempotent on the
    // (tenant_partner_id, roaming_partner_id) link, so a retry after a failure,
    // a CPO partner gaining EMSP and a backfilled partner all get a customer.
    try {
      const { customer, created } =
        await this.pennylaneService.createCompanyCustomer(
          {
            ...toPennylaneCompanyCustomer(body.roamingPartnerName, body),
            tenant_partner_id: tenantPartnerId,
            roaming_partner_id: id,
          },
          authorization,
        );
      return {
        status: `${UPSERT_STATUS[outcome]}; ${pennylaneStatus(created)}`,
        pennylaneCustomerId: customer.id,
      };
    } catch (err) {
      if (
        err instanceof UnsuccessfulRequestException &&
        err.statusCode === 409 &&
        err.code === PENNYLANE_PARTNER_ALREADY_LINKED
      ) {
        return {
          status: `${UPSERT_STATUS[outcome]}; pennylane customer already linked`,
        };
      }
      this.logger.error('Failed to create Pennylane customer', err);
      // The roaming partner is kept; retrying this route is safe.
      throw new UnsuccessfulRequestException(
        `${UPSERT_STATUS[outcome]}; pennylane customer creation failed: ${
          (err as Error)?.message
        }`,
        undefined,
        err instanceof UnsuccessfulRequestException
          ? { statusCode: err.statusCode, code: err.code }
          : undefined,
      );
    }
  }

  /**
   * Deletes a location from the OCPI system this does not delete the location from the CPO system.
   * it change disableOCPI field to true in the location table.
   * and send PUT with EVSE status to REMOVED
   * @param body The request body containing location details.
   * @returns A promise resolving to the deletion status.
   */
  @Post('/disable-location-ocpi')
  @AsAdminEndpoint()
  async deleteLocationOCPI(
    @BodyWithSchema(DeleteLocationBodySchema, DeleteLocationBodySchemaName)
    body: DeleteLocationBody,
  ): Promise<{ status: string } & DeleteLocationSummary> {
    return await this.locationsService.deleteLocationOCPI(body);
  }
  
  /**
   * Creates the Pennylane customer of a direct (peer-to-peer) EMSP partner.
   * The TenantPartner is never created here: it comes from the credentials
   * exchange, so it must already exist. Nothing is written locally, so any TS
   * API failure is returned to the caller as is.
   */
  @Post('/onboard-tenant-partner-emsp')
  @AsAdminEndpoint()
  async onboardTenantPartnerEmsp(
    @BodyWithSchema(
      OnboardTenantPartnerEmspBodySchema,
      OnboardTenantPartnerEmspBodySchemaName,
    )
    rawBody: OnboardTenantPartnerEmspBody,
    // Forwarded to the TS API, which trusts the same Keycloak realm.
    @HeaderParam('authorization') authorization?: string,
  ): Promise<{ status: string; pennylaneCustomerId: number }> {
    const body = parseBody<OnboardTenantPartnerEmspBody>(
      OnboardTenantPartnerEmspBodySchema,
      rawBody,
    );

    const result = await this.ocpiGraphqlClient.request<
      GetTenantPartnerByCpoClientAndModuleIdQueryResult,
      GetTenantPartnerByCpoClientAndModuleIdQueryVariables
    >(GET_TENANT_PARTNER_BY_OUR_AND_PARTNER_IDENTITY, {
      ourCountryCode: body.ourCountryCode,
      ourPartyId: body.ourPartyId,
      partnerCountryCode: body.partnerCountryCode,
      partnerPartyId: body.partnerPartyId,
    });
    const tenantPartner = result.TenantPartners[0];
    if (!tenantPartner) {
      throw new NotFoundException(
        `Tenant partner ${body.partnerCountryCode}-${body.partnerPartyId} not found for ${body.ourCountryCode}-${body.ourPartyId}; run the credentials exchange first`,
      );
    }

    // No roaming_partner_id: a direct contract, not one through a hub.
    const { customer, created } =
      await this.pennylaneService.createCompanyCustomer(
        {
          ...toPennylaneCompanyCustomer(body.tenantPartnerName, body),
          tenant_partner_id: tenantPartner.id,
        },
        authorization,
      );
    return {
      status: pennylaneStatus(created),
      pennylaneCustomerId: customer.id,
    };
  }
}
