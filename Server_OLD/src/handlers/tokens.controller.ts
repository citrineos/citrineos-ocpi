import { Body, Controller, Get, Param, Patch, Put } from "routing-controllers";
import { Service } from "typedi";
import { BaseController, generateMockOcpiResponse } from "./base.controller";
import { AsOcpiFunctionalEndpoint } from "../util/decorators/as.ocpi.functional.endpoint";
import { ResponseSchema } from "../../../00_Base/src/openapi-spec-helper";
import { HttpStatus } from "@citrineos/base";
import { Token, TokenResponse } from "../model/Token";
import { TokenType } from "../model/TokenType";
import { EnumQueryParam } from "../util/decorators/enum.query.param";
import { ModuleId } from "../model/ModuleId";
import { OcpiEmptyResponse } from "../model/ocpi.empty.response";

const MOCK_TOKEN = generateMockOcpiResponse(TokenResponse);
const MOCK_EMPTY = generateMockOcpiResponse(OcpiEmptyResponse);

@Controller(`/${ModuleId.Tokens}`)
@Service()
export class TokensController extends BaseController {
  @Get("/:countryCode/:partyId/:tokenId")
  @AsOcpiFunctionalEndpoint()
  @ResponseSchema(TokenResponse, {
    statusCode: HttpStatus.OK,
    description: "Successful response",
    examples: {
      success: MOCK_TOKEN,
    },
  })
  async getTokens(
    @Param("countryCode") countryCode: string,
    @Param("partyId") partyId: string,
    @Param("tokenId") tokenId: string,
    @EnumQueryParam("type", TokenType, "TokenType") type?: TokenType,
  ): Promise<TokenResponse> {
    console.log("getTokens", countryCode, partyId, tokenId, type);
    return this.generateMockOcpiResponse(TokenResponse);
  }

  @Put("/:countryCode/:partyId/:tokenId")
  @AsOcpiFunctionalEndpoint()
  @ResponseSchema(OcpiEmptyResponse, {
    statusCode: HttpStatus.OK,
    description: "Successful response",
    examples: {
      success: MOCK_EMPTY,
    },
  })
  async putToken(
    @Param("countryCode") countryCode: string,
    @Param("partyId") partyId: string,
    @Param("tokenId") tokenId: string,
    @Body() token: Token,
    @EnumQueryParam("type", TokenType, "TokenType") type?: TokenType,
  ): Promise<OcpiEmptyResponse> {
    console.log("putToken", countryCode, partyId, tokenId, token, type);
    return MOCK_EMPTY;
  }

  @Patch("/:countryCode/:partyId/:tokenId")
  @AsOcpiFunctionalEndpoint()
  @ResponseSchema(OcpiEmptyResponse, {
    statusCode: HttpStatus.OK,
    description: "Successful response",
    examples: {
      success: MOCK_EMPTY,
    },
  })
  async patchToken(
    @Param("countryCode") countryCode: string,
    @Param("partyId") partyId: string,
    @Param("tokenId") tokenId: string,
    @Body() token: Token,
    @EnumQueryParam("type", TokenType, "TokenType") type?: TokenType,
  ): Promise<OcpiEmptyResponse> {
    console.log("patchToken", countryCode, partyId, tokenId, token, type);
    return MOCK_EMPTY;
  }
}
