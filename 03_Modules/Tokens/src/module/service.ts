// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0


import {Service} from "typedi";
import {ModelmockService, Token} from "@citrineos/ocpi-base";

@Service()
export class TokensService {

    constructor(private readonly  modelMockService: ModelmockService) {}

    //TODO get existing token
    async getSingleToken(): Promise<Token>{

        //TODO make repo call

        return this.modelMockService.generateMockModel(Token);
    }

    //TODO add new or update token
    //TOOD partial update of token
}