import { Get, JsonController } from 'routing-controllers';
import { Service } from 'typedi';
import {
  BaseController,
  buildOcpiPaginatedResponse,
  generateMockOcpiResponse,
  ModuleId,
  ResponseSchema,
  OcpiResponseStatusCode,
  OCPIToken,
  PaginatedTokenResponse,
  TokenResponse,
  TokenType,
  WhitelistType
} from '@citrineos/ocpi-base';
import { HttpStatus } from '@citrineos/base';

const TOKENS_LIST_MOCK = generateMockOcpiResponse(
  PaginatedTokenResponse,
); // todo create real mocks for tests

const EMSP_HOST = 'http://localhost:8086';
const EMSP_BASE_URL = `${EMSP_HOST}/ocpi/2.2.1`;

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
  async getTokens(): Promise<PaginatedTokenResponse> {
    console.log('mock get Tokens returning', generateMockOcpiResponse(TokenResponse));
    const data = [OCPIToken.build({
      country_code: 'US',
      party_id: 'MSP',
      uid: 'uid',
      type: TokenType.RFID,
      contract_id: 'contract_001',
      visual_number: '12345',
      issuer: 'issuer',
      group_id: 'group',
      valid: true,
      whitelist: WhitelistType.ALLOWED,
      language: 'en',
      default_profile_type: 'profile',
    }).toTokenDTO()];

    //TODO, this should return the pagination part as headers
    const response = buildOcpiPaginatedResponse(OcpiResponseStatusCode.GenericSuccessCode, 1, 1, 0, data) as PaginatedTokenResponse;
    return response;

  }
}

