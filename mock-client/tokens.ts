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
import { buildGenericServerErrorResponse } from '@citrineos/ocpi-base/dist/util/ResponseGenerator';

const TOKENS_LIST_MOCK = generateMockOcpiResponse(PaginatedTokenResponse); // todo create real mocks for tests

@JsonController(`/2.2.1/${ModuleId.Tokens}`)
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
  ): Promise<OcpiResponse<TokenDTO>> {
    console.log(_paginationParams);

    const fail = false;

    if (fail) {
      return buildGenericServerErrorResponse();
    }

    const token = generateMockOcpiResponse(TokenDTO);

    token.uid = (2 + (_paginationParams?.offset ?? 0)).toString();
    token.country_code = 'US';
    token.party_id = 'MSP';
    token.type = TokenType.APP_USER;

    const response = buildOcpiPaginatedResponse(
      OcpiResponseStatusCode.GenericSuccessCode,
      10,
      1,
      _paginationParams?.offset ?? 0,
      [token],
    ) as OcpiResponse<TokenDTO>;

    await new Promise((resolve) => setTimeout(resolve, 3000));

    return response;
  }
}
