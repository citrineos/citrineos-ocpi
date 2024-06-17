// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { ISessionsModuleApi } from './interface';

import { Controller, Get, QueryParam } from 'routing-controllers';
import { HttpStatus } from '@citrineos/base';
import {
    AsOcpiFunctionalEndpoint,
    BaseController,
    generateMockOcpiResponse,
    ModuleId,
    PaginatedSessionResponse,
    ResponseSchema,
    SessionsService
} from '@citrineos/ocpi-base';

import { Service } from 'typedi';

@Controller(`/${ModuleId.Sessions}`)
@Service()
export class SessionsModuleApi extends BaseController implements ISessionsModuleApi {
    constructor(readonly sessionsService: SessionsService) {
        super();
    }

    @Get()
    @AsOcpiFunctionalEndpoint()
    @ResponseSchema(PaginatedSessionResponse, {
        statusCode: HttpStatus.OK,
        description: 'Successful response',
        examples: {
            success: generateMockOcpiResponse(PaginatedSessionResponse),
        },
    })
    async getSessions(@QueryParam('date_from') dateFrom: Date): Promise<PaginatedSessionResponse> {
        // console.info({dateFrom});
        return this.sessionsService.getSessions();
    } 
}