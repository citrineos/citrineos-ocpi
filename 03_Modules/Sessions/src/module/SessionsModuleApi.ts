// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import type { ISessionsModuleApi } from './ISessionsModuleApi.js';
import {
  Ctx,
  Get,
  JsonController,
  Param,
  Patch,
  Post,
  Put,
} from 'routing-controllers';
import { HttpStatus } from '@zetra/citrineos-base';
import type {
  ChargingPreferences,
  ChargingPreferencesResponse,
  OcpiEmptyResponse,
  PaginatedSessionResponse,
  PullPartnerModulesBody,
  Session,
  SessionResponse,
} from '@citrineos/ocpi-base';
import {
  AsOcpiFunctionalEndpoint,
  BaseController,
  BodyWithSchema,
  buildOcpiEmptyResponse,
  buildOcpiResponse,
  ChargingPreferencesResponseSchema,
  ChargingPreferencesResponseSchemaName,
  ChargingPreferencesSchema,
  ChargingPreferencesSchemaName,
  DEFAULT_LIMIT,
  DEFAULT_OFFSET,
  FunctionalEndpointParams,
  generateMockForSchema,
  InvalidParamException,
  ModuleId,
  NotFoundException,
  OcpiHeaders,
  OcpiResponseStatusCode,
  Paginated,
  PaginatedParams,
  PaginatedSessionResponseSchema,
  PaginatedSessionResponseSchemaName,
  PullPartnerModulesBodySchema,
  PullPartnerModulesBodySchemaName,
  ResponseSchema,
  SessionSchema,
  SessionSchemaName,
  SessionsService,
  versionIdParam,
  VersionNumber,
  VersionNumberParam,
  AsAdminEndpoint,
} from '@citrineos/ocpi-base';

import { Service } from 'typedi';

const MOCK_CHARGING_PREFERENCES = await generateMockForSchema(
  ChargingPreferencesResponseSchema,
  ChargingPreferencesResponseSchemaName,
);

@JsonController(`/:role(cpo|emsp)/:${versionIdParam}/${ModuleId.Sessions}`)
@Service()
export class SessionsModuleApi
  extends BaseController
  implements ISessionsModuleApi
{
  constructor(readonly sessionsService: SessionsService) {
    super();
  }

  /**
   * Sender Interface: GET /sessions (paginated list)
   * Returns our own sessions (from Transactions) for the requesting eMSP.
   */
  @Get()
  @AsOcpiFunctionalEndpoint()
  @ResponseSchema(
    PaginatedSessionResponseSchema,
    PaginatedSessionResponseSchemaName,
    {
      statusCode: HttpStatus.OK,
      description: 'Successful response',
    },
  )
  async getSessions(
    @VersionNumberParam() version: VersionNumber,
    @FunctionalEndpointParams() ocpiHeaders: OcpiHeaders,
    @Paginated() paginatedParams?: PaginatedParams,
  ): Promise<PaginatedSessionResponse> {
    const { data, count } = await this.sessionsService.getSessions(
      ocpiHeaders,
      paginatedParams,
    );

    return {
      data,
      total: count,
      offset: paginatedParams?.offset || DEFAULT_OFFSET,
      limit: paginatedParams?.limit || DEFAULT_LIMIT,
      status_code: OcpiResponseStatusCode.GenericSuccessCode,
      timestamp: new Date(),
    };
  }

  /**
   * Receiver Interface: GET /:country_code/:party_id/:session_id
   * Retrieve a session that was pushed to us by a partner CPO.
   */
  @Get('/:country_code/:party_id/:session_id')
  @AsOcpiFunctionalEndpoint()
  async getSessionById(
    @VersionNumberParam() version: VersionNumber,
    @Param('country_code') countryCode: string,
    @Param('party_id') partyId: string,
    @Param('session_id') sessionId: string,
    @Ctx() ctx?: any,
  ): Promise<SessionResponse> {
    const tenantPartnerId: number | undefined = ctx?.state?.tenantPartner?.id;
    if (tenantPartnerId === undefined) {
      throw new InvalidParamException(
        'Tenant partner information not available',
      );
    }
    const tenantPartner = ctx?.state?.tenantPartner;

    const session = await this.sessionsService.getSessionByOcpiId(
      countryCode,
      partyId,
      sessionId,
      tenantPartnerId,
      tenantPartner,
    );

    if (!session) {
      throw new NotFoundException(
        `Session ${sessionId} not found for ${countryCode}/${partyId}`,
      );
    }

    return buildOcpiResponse<Session>(
      OcpiResponseStatusCode.GenericSuccessCode,
      session,
    );
  }

  /**
   * Receiver Interface: PUT /:country_code/:party_id/:session_id
   * Receive a new or updated session from a partner CPO.
   */
  @Put('/:country_code/:party_id/:session_id')
  @AsOcpiFunctionalEndpoint()
  async putSession(
    @VersionNumberParam() version: VersionNumber,
    @Param('country_code') countryCode: string,
    @Param('party_id') partyId: string,
    @Param('session_id') sessionId: string,
    @BodyWithSchema(SessionSchema, SessionSchemaName)
    sessionBody: Session,
    @Ctx() ctx?: any,
  ): Promise<OcpiEmptyResponse> {
    const tenantId: number | undefined = ctx?.state?.tenantPartner?.tenant?.id;
    const tenantPartnerId: number | undefined = ctx?.state?.tenantPartner?.id;
    const tenantPartner = ctx?.state?.tenantPartner;

    if (tenantId === undefined || tenantPartnerId === undefined) {
      throw new InvalidParamException('Tenant information not available');
    }

    const session: Session = {
      ...sessionBody,
      id: sessionId,
      country_code: countryCode,
      party_id: partyId,
    };

    await this.sessionsService.upsertSession(
      session,
      tenantId,
      tenantPartnerId,
      tenantPartner,
    );

    return buildOcpiEmptyResponse(OcpiResponseStatusCode.GenericSuccessCode);
  }

  /**
   * Receiver Interface: PATCH /:country_code/:party_id/:session_id
   * Partially update a session received from a partner CPO.
   */
  @Patch('/:country_code/:party_id/:session_id')
  @AsOcpiFunctionalEndpoint()
  async patchSession(
    @VersionNumberParam() version: VersionNumber,
    @Param('country_code') countryCode: string,
    @Param('party_id') partyId: string,
    @Param('session_id') sessionId: string,
    @BodyWithSchema(SessionSchema, SessionSchemaName)
    sessionBody: Partial<Session>,
    @Ctx() ctx?: any,
  ): Promise<OcpiEmptyResponse> {
    const tenantPartnerId: number | undefined = ctx?.state?.tenantPartner?.id;
    const tenantPartner = ctx?.state?.tenantPartner;

    if (tenantPartnerId === undefined) {
      throw new InvalidParamException(
        'Tenant partner information not available',
      );
    }

    if (!sessionBody.last_updated) {
      throw new InvalidParamException(
        'PATCH request must contain last_updated field',
      );
    }

    await this.sessionsService.patchSession(
      countryCode,
      partyId,
      sessionId,
      tenantPartnerId,
      sessionBody,
      tenantPartner,
    );

    return buildOcpiEmptyResponse(OcpiResponseStatusCode.GenericSuccessCode);
  }

  /**
   * Sender Interface: PUT /:session_id/charging_preferences
   * Receive charging preferences from an eMSP for an ongoing session.
   * TODO: Forward to charging station via OCPP when integration is available.
   */
  @Put('/:session_id/charging_preferences')
  @AsOcpiFunctionalEndpoint()
  @ResponseSchema(
    ChargingPreferencesResponseSchema,
    ChargingPreferencesResponseSchemaName,
    {
      statusCode: HttpStatus.OK,
      description: 'Successful response',
      examples: {
        success: MOCK_CHARGING_PREFERENCES,
      },
    },
  )
  async updateChargingPreferences(
    @Param('session_id') sessionId: string,
    @BodyWithSchema(ChargingPreferencesSchema, ChargingPreferencesSchemaName)
    body: ChargingPreferences,
  ): Promise<ChargingPreferencesResponse> {
    this.logger.info(
      `Received charging preferences for session ${sessionId}`,
      body,
    );
    return MOCK_CHARGING_PREFERENCES;
  }

  /**
   * ADMIN ENDPOINTS
   */
  @Post('/pull-partner-sessions')
  @AsAdminEndpoint()
  async PullPartnerSessions(
    @BodyWithSchema(
      PullPartnerModulesBodySchema,
      PullPartnerModulesBodySchemaName,
    )
    body: PullPartnerModulesBody,
  ) {
    this.logger.info('PullPartnerSessions', body);
    const summary = await this.sessionsService.pullPartnerSessions(body);
    return buildOcpiResponse(
      OcpiResponseStatusCode.GenericSuccessCode,
      summary,
    );
  }
}
