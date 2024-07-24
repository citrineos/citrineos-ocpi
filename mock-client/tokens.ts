import { Get, JsonController } from 'routing-controllers';
import { Service } from 'typedi';
import {
  BaseController,
  buildOcpiPaginatedResponse,
  generateMockOcpiResponse,
  ModuleId,
  OcpiResponse,
  OcpiResponseStatusCode,
  Paginated,
  PaginatedParams,
  PaginatedTokenResponse,
  ResponseSchema,
  TokenDTO,
  TokenType,
} from '@citrineos/ocpi-base';
import { HttpStatus } from '@citrineos/base';
import { ResponseGenerator } from '@citrineos/ocpi-base';

const TOKENS_LIST_MOCK = generateMockOcpiResponse(PaginatedTokenResponse); // todo create real mocks for tests

@JsonController(`/2.2.1/${ModuleId.Tokens}`)
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
}
