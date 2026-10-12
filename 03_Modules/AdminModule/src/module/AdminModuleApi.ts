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
  LocationsPullService,
  NotFoundException,
  OcpiGraphqlClient,
  OcpiHeaders,
  OcpiLogger,
  OcpiResponseStatusCode,
  OnboardRoamingPartnerBodySchema,
  OnboardRoamingPartnerBodySchemaName,
  Paginated,
  PaginatedParams,
  SessionsService,
  type GetAllTenantPartnersQueryResult,
  type GetAllTenantPartnersQueryVariables,
  type GetTenantPartnerByIdQueryResult,
  type GetTenantPartnerByIdQueryVariables,
  DeleteLocationBodySchema,
  DeleteLocationBodySchemaName,
  TariffsService,
  LocationsService,
  type OnboardRoamingPartnerBody,
  type DeleteLocationBody,
  type DeleteLocationSummary,
} from '@citrineos/ocpi-base';
import { Get, JsonController, Param, Post } from 'routing-controllers';
import { Service } from 'typedi';
import { RoamingPartnerService } from '@citrineos/ocpi-base';

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
  async onboardRoamingPartner(
    @BodyWithSchema(
      OnboardRoamingPartnerBodySchema,
      OnboardRoamingPartnerBodySchemaName,
    )
    body: OnboardRoamingPartnerBody,
  ): Promise<{ status: string }> {
    const roamingPartnerId =
      await this.roamingPartnerService.createRoamingPartner(body);
    if (!roamingPartnerId) {
      return { status: 'failed To create roaming partner' };
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
  async createRoamingPartner(
    @BodyWithSchema(
      OnboardRoamingPartnerBodySchema,
      OnboardRoamingPartnerBodySchemaName,
    )
    body: OnboardRoamingPartnerBody,
  ): Promise<{ status: string }> {
    const roamingPartnerId =
      await this.roamingPartnerService.createRoamingPartner(body);
    if (!roamingPartnerId) {
      return { status: 'failed To create roaming partner' };
    }
    return { status: 'roaming partner created' };
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
    @BodyWithSchema(
      DeleteLocationBodySchema,
      DeleteLocationBodySchemaName,
    )
    body: DeleteLocationBody,
  ): Promise<{ status: string } & DeleteLocationSummary> {
    return await this.locationsService.deleteLocationOCPI(body);
  }
}
