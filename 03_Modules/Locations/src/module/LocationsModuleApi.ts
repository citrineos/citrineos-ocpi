// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import {
  Get,
  JsonController,
  Param,
  Put,
  Patch,
  Post,
  Ctx,
} from 'routing-controllers';
import {
  BodyWithSchema,
  LocationDTOSchema,
  LocationDTOSchemaName,
  EvseDTOSchema,
  EvseDTOSchemaName,
  LocationPatchSchema,
  LocationPatchSchemaName,
  EvsePatchSchema,
  EvsePatchSchemaName,
  ConnectorDTOSchema,
  ConnectorDTOSchemaName,
  ConnectorPatchSchema,
  ConnectorPatchSchemaName,
  AsAdminEndpoint,
  PullPartnerModulesBodySchema,
  PullPartnerModulesBodySchemaName,
  type PullPartnerModulesBody,
  buildOcpiResponse,
} from '@citrineos/ocpi-base';
import type { ILocationsModuleApi } from './ILocationsModuleApi.js';
import type {
  ConnectorResponse,
  EvseResponse,
  LocationEvseDTO,
  LocationDTO,
  LocationResponse,
  OcpiEmptyResponse,
  PaginatedLocationResponse,
  EvseDTO,
  ConnectorDTO,
} from '@citrineos/ocpi-base';
import {
  AsOcpiFunctionalEndpoint,
  BaseController,
  buildOcpiEmptyResponse,
  ConnectorResponseSchema,
  ConnectorResponseSchemaName,
  EvseResponseSchema,
  EvseResponseSchemaName,
  EXTRACT_EVSE_ID,
  EXTRACT_STATION_ID,
  FunctionalEndpointParams,
  generateMockForSchema,
  generateMockOcpiPaginatedResponse,
  LocationResponseSchema,
  LocationResponseSchemaName,
  LocationsService,
  LocationReceiverService,
  LocationsPullService,
  ModuleId,
  OcpiHeaders,
  OcpiResponseStatusCode,
  Paginated,
  PaginatedLocationResponseSchema,
  PaginatedLocationResponseSchemaName,
  PaginatedParams,
  ResponseSchema,
  versionIdParam,
  VersionNumber,
  VersionNumberParam,
} from '@citrineos/ocpi-base';
import { Service } from 'typedi';
import { HttpStatus, type TenantPartnerDto } from '@zetra/citrineos-base';

const RCV = '/:country_code/:party_id/:location_id';
const RCV_EVSE = `${RCV}/:evse_uid`;
const RCV_CONN = `${RCV_EVSE}/:connector_id`;

const MOCK_PAGINATED_LOCATION = await generateMockOcpiPaginatedResponse(
  PaginatedLocationResponseSchema,
  PaginatedLocationResponseSchemaName,
  new PaginatedParams(),
);
const MOCK_LOCATION = await generateMockForSchema(
  LocationResponseSchema,
  LocationResponseSchemaName,
);
const MOCK_EVSE = await generateMockForSchema(
  EvseResponseSchema,
  EvseResponseSchemaName,
);
const MOCK_CONNECTOR = await generateMockForSchema(
  ConnectorResponseSchema,
  ConnectorResponseSchemaName,
);

/**
 * Server API for the provisioning component.
 */
@JsonController(`/:role(cpo|emsp)/:${versionIdParam}/${ModuleId.Locations}`)
@Service()
export class LocationsModuleApi
  extends BaseController
  implements ILocationsModuleApi
{
  constructor(
    readonly locationsService: LocationsService,
    readonly locationsReceiverService: LocationReceiverService,
    readonly locationsPullService: LocationsPullService,
  ) {
    super();
  }

  //-- Receiver Interface (OCPI 2.2.1 — register before Sender) ------------//

  @Get(RCV_CONN)
  @AsOcpiFunctionalEndpoint()
  @ResponseSchema(ConnectorResponseSchema, ConnectorResponseSchemaName, {
    statusCode: HttpStatus.OK,
    description: 'CPO validates connector stored in eMSP system',
  })
  async getConnectorByCountryParty(
    @VersionNumberParam() version: VersionNumber,
    @Param('country_code') countryCode: string,
    @Param('party_id') partyId: string,
    @Param('location_id') locationId: string,
    @Param('evse_uid') evseUid: string,
    @Param('connector_id') connectorId: string,
    @Ctx() ctx: any,
  ): Promise<ConnectorResponse> {
    const tenantPartner = ctx.state.tenantPartner as TenantPartnerDto;
    return this.locationsReceiverService.getConnectorByCountryPartyAndId(
      countryCode,
      partyId,
      locationId,
      evseUid,
      connectorId,
      tenantPartner,
    );
  }

  @Get(RCV_EVSE)
  @AsOcpiFunctionalEndpoint()
  @ResponseSchema(EvseResponseSchema, EvseResponseSchemaName, {
    statusCode: HttpStatus.OK,
    description: 'CPO validates EVSE stored in eMSP system',
  })
  async getEvseByCountryParty(
    @VersionNumberParam() version: VersionNumber,
    @Param('country_code') countryCode: string,
    @Param('party_id') partyId: string,
    @Param('location_id') locationId: string,
    @Param('evse_uid') evseUid: string,
    @Ctx() ctx: any,
  ): Promise<EvseResponse> {
    const tenantPartner = ctx.state.tenantPartner as TenantPartnerDto;
    return this.locationsReceiverService.getEvseByCountryPartyAndId(
      countryCode,
      partyId,
      locationId,
      evseUid,
      tenantPartner,
    );
  }

  @Get(RCV)
  @AsOcpiFunctionalEndpoint()
  @ResponseSchema(LocationResponseSchema, LocationResponseSchemaName, {
    statusCode: HttpStatus.OK,
    description: 'CPO validates location stored in eMSP system',
  })
  async getLocationByCountryPartyAndId(
    @VersionNumberParam() version: VersionNumber,
    @Param('country_code') countryCode: string,
    @Param('party_id') partyId: string,
    @Param('location_id') locationId: string,
    @Ctx() ctx: any,
  ): Promise<LocationResponse> {
    const tenantPartner = ctx.state.tenantPartner as TenantPartnerDto;
    const response =
      await this.locationsReceiverService.getLocationByCountryPartyAndId(
        countryCode,
        partyId,
        locationId,
        tenantPartner,
      );
    return response as LocationResponse;
  }

  @Put(RCV_CONN)
  @AsOcpiFunctionalEndpoint()
  async putConnectorByCountryParty(
    @VersionNumberParam() version: VersionNumber,
    @Param('country_code') countryCode: string,
    @Param('party_id') partyId: string,
    @Param('location_id') locationId: string,
    @Param('evse_uid') evseUid: string,
    @Param('connector_id') connectorId: string,
    @BodyWithSchema(ConnectorDTOSchema, ConnectorDTOSchemaName)
    connector: ConnectorDTO,
    @Ctx() ctx: any,
  ): Promise<OcpiEmptyResponse | LocationResponse> {
    this.logger.info(
      `PUT receiver connector ${countryCode}/${partyId}/${locationId}/${evseUid}/${connectorId}`,
    );
    const tenantPartner = ctx.state.tenantPartner as TenantPartnerDto;
    const err =
      await this.locationsReceiverService.putConnectorByCountryPartyAndId(
        countryCode,
        partyId,
        locationId,
        evseUid,
        connectorId,
        connector,
        tenantPartner,
      );
    if (err) return err;
    return buildOcpiEmptyResponse(OcpiResponseStatusCode.GenericSuccessCode);
  }

  @Put(RCV_EVSE)
  @AsOcpiFunctionalEndpoint()
  async putEvseByCountryParty(
    @VersionNumberParam() version: VersionNumber,
    @Param('country_code') countryCode: string,
    @Param('party_id') partyId: string,
    @Param('location_id') locationId: string,
    @Param('evse_uid') evseUid: string,
    @BodyWithSchema(EvseDTOSchema, EvseDTOSchemaName)
    evse: EvseDTO,
    @Ctx() ctx: any,
  ): Promise<OcpiEmptyResponse | LocationResponse> {
    this.logger.info(
      `PUT receiver evse ${countryCode}/${partyId}/${locationId}/${evseUid}`,
    );
    const tenantPartner = ctx.state.tenantPartner as TenantPartnerDto;
    const err = await this.locationsReceiverService.putEvseByCountryPartyAndId(
      countryCode,
      partyId,
      locationId,
      evseUid,
      evse,
      tenantPartner,
    );
    if (err) return err;
    return buildOcpiEmptyResponse(OcpiResponseStatusCode.GenericSuccessCode);
  }

  @Put(RCV)
  @AsOcpiFunctionalEndpoint()
  async putLocationByCountryParty(
    @VersionNumberParam() version: VersionNumber,
    @Param('country_code') countryCode: string,
    @Param('party_id') partyId: string,
    @Param('location_id') locationId: string,
    @BodyWithSchema(LocationDTOSchema, LocationDTOSchemaName)
    location: LocationDTO,
    @Ctx() ctx: any,
  ): Promise<OcpiEmptyResponse | LocationResponse> {
    this.logger.info(
      `PUT receiver location ${countryCode}/${partyId}/${locationId}`,
    );
    const tenantPartner = ctx.state.tenantPartner as TenantPartnerDto;
    const err =
      await this.locationsReceiverService.putLocationByCountryPartyAndId(
        countryCode,
        partyId,
        location,
        locationId,
        tenantPartner,
      );
    if (err) return err;
    return buildOcpiEmptyResponse(OcpiResponseStatusCode.GenericSuccessCode);
  }

  @Patch(RCV_CONN)
  @AsOcpiFunctionalEndpoint()
  async patchConnectorByCountryParty(
    @VersionNumberParam() version: VersionNumber,
    @Param('country_code') countryCode: string,
    @Param('party_id') partyId: string,
    @Param('location_id') locationId: string,
    @Param('evse_uid') evseUid: string,
    @Param('connector_id') connectorId: string,
    @BodyWithSchema(ConnectorPatchSchema, ConnectorPatchSchemaName)
    connector: Partial<ConnectorDTO>,
    @Ctx() ctx: any,
  ): Promise<OcpiEmptyResponse | LocationResponse> {
    this.logger.info(
      `PATCH receiver connector ${countryCode}/${partyId}/${locationId}/${evseUid}/${connectorId}`,
    );
    const tenantPartner = ctx.state.tenantPartner as TenantPartnerDto;
    const err =
      await this.locationsReceiverService.patchConnectorByCountryPartyAndId(
        countryCode,
        partyId,
        locationId,
        evseUid,
        connectorId,
        connector,
        tenantPartner,
      );
    if (err) return err;
    return buildOcpiEmptyResponse(OcpiResponseStatusCode.GenericSuccessCode);
  }

  @Patch(RCV_EVSE)
  @AsOcpiFunctionalEndpoint()
  async patchEvseByCountryParty(
    @VersionNumberParam() version: VersionNumber,
    @Param('country_code') countryCode: string,
    @Param('party_id') partyId: string,
    @Param('location_id') locationId: string,
    @Param('evse_uid') evseUid: string,
    @BodyWithSchema(EvsePatchSchema, EvsePatchSchemaName)
    evse: Partial<LocationEvseDTO>,
    @Ctx() ctx: any,
  ): Promise<OcpiEmptyResponse | LocationResponse> {
    this.logger.info(
      `PATCH receiver evse ${countryCode}/${partyId}/${locationId}/${evseUid}`,
    );
    const tenantPartner = ctx.state.tenantPartner as TenantPartnerDto;
    const err =
      await this.locationsReceiverService.patchEvseByCountryPartyAndId(
        countryCode,
        partyId,
        locationId,
        evseUid,
        evse,
        tenantPartner,
      );
    if (err?.status_code === OcpiResponseStatusCode.ClientUnknownLocation) {
      ctx.status = HttpStatus.NOT_FOUND;
    }
    if (err) return err;
    return buildOcpiEmptyResponse(OcpiResponseStatusCode.GenericSuccessCode);
  }

  @Patch(RCV)
  @AsOcpiFunctionalEndpoint()
  async patchLocationByCountryParty(
    @VersionNumberParam() version: VersionNumber,
    @Param('country_code') countryCode: string,
    @Param('party_id') partyId: string,
    @Param('location_id') locationId: string,
    @BodyWithSchema(LocationPatchSchema, LocationPatchSchemaName)
    location: Partial<LocationDTO>,
    @Ctx() ctx: any,
  ): Promise<OcpiEmptyResponse | LocationResponse> {
    this.logger.info(
      `PATCH receiver location ${countryCode}/${partyId}/${locationId}`,
    );
    const tenantPartner = ctx.state.tenantPartner as TenantPartnerDto;
    const err =
      await this.locationsReceiverService.patchLocationByCountryPartyAndId(
        countryCode,
        partyId,
        locationId,
        location,
        tenantPartner,
      );
    if (err) return err;
    return buildOcpiEmptyResponse(OcpiResponseStatusCode.GenericSuccessCode);
  }

  //-- Sender Interface ------------------------------------------------------//

  /**
   * Sender Interface: GET /locations
   */
  @Get()
  @AsOcpiFunctionalEndpoint()
  @ResponseSchema(
    PaginatedLocationResponseSchema,
    PaginatedLocationResponseSchemaName,
    {
      statusCode: HttpStatus.OK,
      description: 'Successful response',
      examples: {
        success: MOCK_PAGINATED_LOCATION,
      },
    },
  )
  async getLocations(
    @VersionNumberParam() version: VersionNumber,
    @FunctionalEndpointParams() ocpiHeaders: OcpiHeaders,
    @Paginated() paginatedParams?: PaginatedParams,
  ): Promise<PaginatedLocationResponse> {
    return this.locationsService.getLocations(ocpiHeaders, paginatedParams);
  }

  /**
   * Sender Interface: GET /locations/:location_id
   */
  @Get('/:location_id')
  @AsOcpiFunctionalEndpoint()
  @ResponseSchema(LocationResponseSchema, LocationResponseSchemaName, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: {
      success: MOCK_LOCATION,
    },
  })
  async getLocationById(
    @VersionNumberParam() version: VersionNumber,
    @Param('location_id') locationId: number,
  ): Promise<LocationResponse> {
    return this.locationsService.getLocationById(locationId);
  }

  /**
   * Sender Interface: GET /locations/:location_id/:evse_uid
   */
  @Get('/:location_id/:evse_uid')
  @AsOcpiFunctionalEndpoint()
  @ResponseSchema(EvseResponseSchema, EvseResponseSchemaName, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: {
      success: MOCK_EVSE,
    },
  })
  async getEvseById(
    @VersionNumberParam() version: VersionNumber,
    @Param('location_id') locationId: number,
    @Param('evse_uid') evseUid: string,
  ): Promise<EvseResponse> {
    const stationId = EXTRACT_STATION_ID(evseUid);
    const evseId = EXTRACT_EVSE_ID(evseUid);

    return this.locationsService.getEvseById(
      locationId,
      stationId,
      Number(evseId),
    );
  }

  /**
   * Sender Interface: GET /locations/:location_id/:evse_uid/:connector_id
   */
  @Get('/:location_id/:evse_uid/:connector_id')
  @AsOcpiFunctionalEndpoint()
  @ResponseSchema(ConnectorResponseSchema, ConnectorResponseSchemaName, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: {
      success: MOCK_CONNECTOR,
    },
  })
  async getConnectorById(
    @VersionNumberParam() version: VersionNumber,
    @Param('location_id') locationId: number,
    @Param('evse_uid') evseUid: string,
    @Param('connector_id') connectorId: string,
  ): Promise<ConnectorResponse> {
    const stationId = EXTRACT_STATION_ID(evseUid);
    const evseId = EXTRACT_EVSE_ID(evseUid);

    return this.locationsService.getConnectorById(
      locationId,
      stationId,
      Number(evseId),
      Number(connectorId),
    );
  }

  /**
   * ADMIN ENDPOINTS
   */
  @Post('/pull-partner-locations')
  @AsAdminEndpoint()
  async PullPartnerLocations(
    @BodyWithSchema(
      PullPartnerModulesBodySchema,
      PullPartnerModulesBodySchemaName,
    )
    body: PullPartnerModulesBody,
  ) {
    this.logger.info('PullPartnerLocations', body);

    const summary = await this.locationsPullService.PullPartnerLocations(body);

    return buildOcpiResponse(
      OcpiResponseStatusCode.GenericSuccessCode,
      summary,
    );
  }
}
