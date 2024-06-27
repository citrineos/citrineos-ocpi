import {
  AsOcpiRegistrationEndpoint,
  AuthToken,
  BaseController,
  ClientInformation,
  CredentialsDTO,
  CredentialsResponse,
  CredentialsService,
  generateMockOcpiResponse,
  ModuleId,
  OcpiEmptyResponse,
  OcpiLogger,
  OcpiResponseStatusCode,
  ResponseSchema,
  toCredentialsDTO,
  versionIdParam,
  VersionNumber,
  VersionNumberParam,
} from '@citrineos/ocpi-base';
import { HttpStatus } from '@citrineos/base';
import { Service } from 'typedi';
import { ICredentialsModuleApi } from './interface';
import {
  Body,
  Delete,
  Get,
  JsonController,
  Post,
  Put,
} from 'routing-controllers';

const MOCK_CREDENTIALS_RESPONSE = generateMockOcpiResponse(CredentialsResponse);
const MOCK_EMPTY = generateMockOcpiResponse(OcpiEmptyResponse);

@JsonController(`/:${versionIdParam}/${ModuleId.Credentials}`)
@Service()
export class CredentialsModuleApi
  extends BaseController
  implements ICredentialsModuleApi
{
  constructor(
    readonly logger: OcpiLogger,
    readonly credentialsService: CredentialsService,
  ) {
    super();
  }

  @Get()
  @AsOcpiRegistrationEndpoint()
  @ResponseSchema(CredentialsResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: {
      success: {
        summary: 'A successful response',
        value: MOCK_CREDENTIALS_RESPONSE,
      },
    },
  })
  async getCredentials(
    @VersionNumberParam() _version: VersionNumber,
    @AuthToken() token: string,
  ): Promise<CredentialsResponse> {
    this.logger.info('getCredentials', _version);
    const clientInformation =
      await this.credentialsService?.getClientInformation(token);
    const credentialsDto = toCredentialsDTO(
      clientInformation.get({ plain: true }),
    );
    return CredentialsResponse.build(credentialsDto);
  }

  @Post()
  @AsOcpiRegistrationEndpoint()
  @ResponseSchema(CredentialsResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: {
      success: {
        summary: 'A successful response',
        value: MOCK_CREDENTIALS_RESPONSE,
      },
    },
  })
  async postCredentials(
    @VersionNumberParam() version: VersionNumber,
    @AuthToken() token: string,
    @Body() credentials: CredentialsDTO,
  ): Promise<CredentialsResponse> {
    this.logger.info('postCredentials', version, credentials);
    const clientInformation = await this.credentialsService?.postCredentials(
      token,
      credentials,
      version,
    );
    return CredentialsResponse.build(
      toCredentialsDTO(clientInformation.get({ plain: true })),
    );
  }

  @Put()
  @AsOcpiRegistrationEndpoint()
  @ResponseSchema(CredentialsResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: {
      success: {
        summary: 'A successful response',
        value: MOCK_CREDENTIALS_RESPONSE,
      },
    },
  })
  async putCredentials(
    @VersionNumberParam() version: VersionNumber,
    @AuthToken() token: string,
    @Body() credentials: CredentialsDTO,
  ): Promise<CredentialsResponse> {
    this.logger.info('putCredentials', version, credentials);
    const clientInformation = await this.credentialsService?.putCredentials(
      token,
      credentials,
    );
    return CredentialsResponse.build(
      toCredentialsDTO(clientInformation.get({ plain: true })),
    );
  }

  @Delete()
  @AsOcpiRegistrationEndpoint()
  @ResponseSchema(OcpiEmptyResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: {
      success: {
        summary: 'A successful response',
        value: MOCK_EMPTY,
      },
    },
  })
  async deleteCredentials(
    @VersionNumberParam() _version: VersionNumber,
    @AuthToken() token: string,
  ): Promise<OcpiEmptyResponse> {
    this.logger.info('deleteCredentials', _version);
    await this.credentialsService?.deleteCredentials(token);
    return OcpiEmptyResponse.build(OcpiResponseStatusCode.GenericSuccessCode);
  }

  @Post('/admin')
  @ResponseSchema(CredentialsResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: {
      success: {
        summary: 'A successful response',
        value: MOCK_EMPTY,
      },
    },
  })
  async registerCredentialsTokenA(
    @VersionNumberParam() versionNumber: VersionNumber,
    @Body() credentials: CredentialsDTO,
  ): Promise<CredentialsResponse> {
    this.logger.info('registerCredentialsTokenA', credentials);
    let clientInformation: ClientInformation =
      await this.credentialsService?.registerCredentialsTokenA(
        versionNumber,
        credentials,
      );
    clientInformation = clientInformation.get
      ? clientInformation.get({ plain: true })
      : clientInformation;
    return CredentialsResponse.build(toCredentialsDTO(clientInformation));
  }
}
