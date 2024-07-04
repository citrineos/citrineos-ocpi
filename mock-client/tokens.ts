import { Get, JsonController } from 'routing-controllers';
import { Service } from 'typedi';
import {
  BaseController,
  generateMockOcpiResponse,
  ModuleId,
  OcpiResponseStatusCode,
  ResponseSchema, Token,
  TokenDTO,
  TokenResponse,
  TokenType,
} from '@citrineos/ocpi-base';
import { HttpStatus } from '@citrineos/base';
import { WhitelistType } from '@citrineos/ocpi-base/dist/model/WhitelistType';

const TOKENS_LIST_MOCK = generateMockOcpiResponse(
  TokenResponse,
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
  // @AsOcpiRegistrationEndpoint()
  @ResponseSchema(TokenResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: {
      success: TOKENS_LIST_MOCK,
    },
  })
  async getTokens(): Promise<TokenResponse> {
    console.log('mock get Tokens returning', generateMockOcpiResponse(TokenResponse));
    const data =  Token.build({ country_code: 'US', party_id: 'MSP', uid: 'uid', type: TokenType.RFID, contract_id: "contract_001", visual_number: "12345", issuer: "issuer", group_id: "group", valid: true, whitelist: WhitelistType.ALLOWED, language: "en", default_profile_type: "profile" }).toTokenDTO();

    const response = TokenResponse.build(OcpiResponseStatusCode.GenericSuccessCode, data, 'success');
    return response;

  }
}

