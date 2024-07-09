import { Get, JsonController } from 'routing-controllers';
import { Service } from 'typedi';
import {
  BaseController,
  buildOcpiPaginatedResponse,
  generateMockOcpiResponse,
  ModuleId,
  OcpiResponseStatusCode,
  OCPIToken,
  Paginated,
  PaginatedParams,
  PaginatedTokenResponse,
  ResponseSchema,
  TokenDTO,
  TokenType,
  WhitelistType,
} from '@citrineos/ocpi-base';
import { HttpStatus } from '@citrineos/base';

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
    @Paginated() paginationParams?: PaginatedParams,
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
}
