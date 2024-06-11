// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { ICommandsModuleApi } from './interface';

import {Body, Controller, Post, useKoaServer} from 'routing-controllers';
import { HttpStatus } from '@citrineos/base';
import {BaseController, CommandsService, generateMockOcpiResponse} from '@citrineos/ocpi-base';
import { CommandType } from '@citrineos/ocpi-base';
import { CancelReservation } from '@citrineos/ocpi-base';
import { ReserveNow } from '@citrineos/ocpi-base';
import { StartSession } from '@citrineos/ocpi-base';
import { StopSession } from '@citrineos/ocpi-base';
import { UnlockConnector } from '@citrineos/ocpi-base';
import { OcpiCommandResponse } from '@citrineos/ocpi-base';
import { ModuleId } from '@citrineos/ocpi-base';

import { AsOcpiFunctionalEndpoint } from '@citrineos/ocpi-base';
import { MultipleTypes } from '@citrineos/ocpi-base';
import { EnumParam } from '@citrineos/ocpi-base';
import { ResponseSchema } from '@citrineos/ocpi-base';

import { Service } from 'typedi';

import Koa from 'koa';

/**
 * Server API for the provisioning component.
 */
@Controller(`/${ModuleId.Commands}`)
@Service()
export class CommandsModuleApi extends BaseController implements ICommandsModuleApi {
    constructor(readonly commandsService: CommandsService) {
        super();
    }

    @Post('/:commandType')
    @AsOcpiFunctionalEndpoint()
    @ResponseSchema(OcpiCommandResponse, {
        statusCode: HttpStatus.OK,
        description: 'Successful response',
        examples: {
            success: generateMockOcpiResponse(OcpiCommandResponse),
        },
    })
    async postCommand(
        @EnumParam('commandType', CommandType, 'CommandType')
            _commandType: CommandType,
        @Body()
        @MultipleTypes(
            CancelReservation,
            ReserveNow,
            StartSession,
            StopSession,
            UnlockConnector,
        )
            _payload:
            | CancelReservation
            | ReserveNow
            | StartSession
            | StopSession
            | UnlockConnector,
    ): Promise<OcpiCommandResponse> {
        console.log('postCommand', _commandType, _payload);
        // return this.commandsService.postCommand(_commandType, _payload);
        return this.commandsService.postCommand(_commandType, _payload);
    }
}
