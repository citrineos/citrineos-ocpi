import { Get, JsonController, Post } from 'routing-controllers';
import { Service } from 'typedi';
import {
  AuthorizationInfoAllowed,
  BaseController,
  buildOcpiPaginatedResponse,
  generateMockOcpiResponse,
  ModuleId,
  OcpiResponseStatusCode,
  OcpiToken,
  Paginated,
  PaginatedParams,
  PaginatedTokenResponse,
  ResponseSchema,
  TokenDTO,
  TokenType,
  VersionNumber,
  WhitelistType,
} from '@citrineos/ocpi-base';
import { HttpStatus } from '@citrineos/base';
import { AuthorizationInfo, AuthorizationInfoResponse } from '@citrineos/ocpi-base/dist/model/AuthorizationInfo';

const TOKENS_LIST_MOCK = generateMockOcpiResponse(PaginatedTokenResponse); // todo create real mocks for tests

@JsonController(`/${VersionNumber.TWO_DOT_TWO_DOT_ONE}/${ModuleId.Tokens}`)
@Service()
export class TokensController extends BaseController {
  constructor() {
    super();
  }

  @Get()
  @ResponseSchema(PaginatedTokenResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: {
      success: TOKENS_LIST_MOCK,
    },
  })
  async getTokens(
    @Paginated() _paginationParams?: PaginatedParams,
  ): Promise<PaginatedTokenResponse> {
    const response = buildOcpiPaginatedResponse(
      OcpiResponseStatusCode.GenericSuccessCode,
      10,
      1,
      0,
      [generateMockOcpiResponse(TokenDTO)],
    ) as PaginatedTokenResponse;
    return response;
  }

  @Post('/:tokenId/authorize')
  @ResponseSchema(PaginatedTokenResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: {
      success: TOKENS_LIST_MOCK,
    },
  })
  async authorizeToken(): Promise<AuthorizationInfoResponse> {
    const ocpiToken = new OcpiToken();
    ocpiToken.authorization_id = 1;
    ocpiToken.country_code = 'US';
    ocpiToken.party_id = 'MSP';
    ocpiToken.type = TokenType.RFID;
    ocpiToken.issuer = 'issuer';
    ocpiToken.whitelist = WhitelistType.ALLOWED;
    ocpiToken.last_updated = new Date();
    const authorizationInfo = new AuthorizationInfo();
    authorizationInfo.allowed = AuthorizationInfoAllowed.Allowed;
    authorizationInfo.token = ocpiToken;
    authorizationInfo.authorizationReference = 'authorizationReference';
    const authorizationInfoResponse = new AuthorizationInfoResponse();
    authorizationInfoResponse.data = authorizationInfo;
    authorizationInfoResponse.status_code = OcpiResponseStatusCode.GenericSuccessCode;
    authorizationInfoResponse.timestamp = new Date();
    return authorizationInfoResponse;
  }
}
