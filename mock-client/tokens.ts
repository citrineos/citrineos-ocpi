import { Get, JsonController, Post } from 'routing-controllers';
import { Service } from 'typedi';
import {
  AuthorizationInfoAllowed,
  BaseController,
  buildOcpiPaginatedResponse,
  generateMockOcpiResponse,
  ModuleId,
  OcpiResponse,
  OcpiResponseStatusCode,
  OcpiToken,
  Paginated,
  PaginatedParams,
  PaginatedTokenResponse,
  ResponseGenerator,
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
  DEFAULT_TOTAL_OBJECTS = 10;
  DEFAULT_LIMIT = 1;
  RETURN_ERROR = false;

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
  ): Promise<OcpiResponse<TokenDTO>> {
    console.log(_paginationParams);

    if (this.RETURN_ERROR) {
      return ResponseGenerator.buildGenericServerErrorResponse();
    }

    const token = generateMockOcpiResponse(TokenDTO);

    token.uid = (2 + (_paginationParams?.offset ?? 0)).toString(); // Avoid collision with Token UID 1 which is seeded.
    token.country_code = 'US';
    token.party_id = 'MSP';
    token.type = TokenType.APP_USER;

    const response = buildOcpiPaginatedResponse(
      OcpiResponseStatusCode.GenericSuccessCode,
      this.DEFAULT_TOTAL_OBJECTS,
      this.DEFAULT_LIMIT,
      _paginationParams?.offset ?? 0,
      [token],
    ) as OcpiResponse<TokenDTO>;

    await new Promise((resolve) => setTimeout(resolve, 3000));

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
