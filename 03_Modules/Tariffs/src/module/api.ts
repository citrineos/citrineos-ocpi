// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0


import {ITariffsModuleApi} from './interface';

import {Body, Get, JsonController, Post} from 'routing-controllers';

import {HttpStatus, TariffKey} from '@citrineos/base';
import {
    AsOcpiFunctionalEndpoint,
    BaseController,
    generateMockOcpiResponse,
    ModuleId,
    OcpiResponse,
    OcpiResponseStatusCode,
    Paginated,
    PaginatedParams,
    PaginatedTariffResponse,
    ResponseSchema,
    TariffDto,
    TariffsBroadcaster,
    TariffsService
} from '@citrineos/ocpi-base';

import {Service} from 'typedi';

@Service()
@JsonController(`/${ModuleId.Tariffs}`)
export class TariffsModuleApi extends BaseController implements ITariffsModuleApi {

    constructor(readonly tariffService: TariffsService,
                readonly tariffsPublisher: TariffsBroadcaster) {
        super();
    }

    @Get()
    @AsOcpiFunctionalEndpoint()
    @ResponseSchema(PaginatedTariffResponse, {
        statusCode: HttpStatus.OK,
        description: 'Successful response',
        examples: {
            success: generateMockOcpiResponse(OcpiResponse<PaginatedTariffResponse>),
        },
    })
    async getTariffs(
        @Paginated() paginationParams?: PaginatedParams,
    ): Promise<PaginatedTariffResponse> {
        console.log(`GET /tariffs ${JSON.stringify(paginationParams)}`);
        const {rows, count} = await this.tariffService.getTariffs(paginationParams);

        return {
            data: rows.map(TariffDto.from),
            total: count,
            offset: paginationParams?.offset,
            limit: paginationParams?.limit,
            status_code: OcpiResponseStatusCode.GenericSuccessCode,
            timestamp: new Date(),
        }
    }

    // TODO: auth & reorganize
    @Post(`/tariff-broadcasts`)
    async broadcastTariff(
        @Body() broadcastRequest: TariffKey & { eventType: 'created' | 'updated' | 'deleted' },
    ): Promise<void> {
        console.log(`POST /tariff-broadcasts ${JSON.stringify(broadcastRequest)}`);

        switch (broadcastRequest.eventType) {
            case 'deleted':
                return this.tariffsPublisher.broadcastDeletionByKey(broadcastRequest);
            case 'updated':
                return this.tariffsPublisher.broadcastByKey(broadcastRequest);
            case 'created':
                return this.tariffsPublisher.broadcastByKey(broadcastRequest);
            default:
                throw new Error(`Unsupported event type ${broadcastRequest.eventType}`);
        }
    }

}
