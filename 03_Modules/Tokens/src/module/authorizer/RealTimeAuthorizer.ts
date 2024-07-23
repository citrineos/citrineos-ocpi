import { AuthorizationStatusEnumType, IdTokenInfoType, IMessageContext } from '@citrineos/base';
import { Authorization, IdToken, IdTokenInfo } from '@citrineos/data';
import { IAuthorizer } from '@citrineos/util';
import {
  AuthorizationInfoAllowed,
  ClientInformationProps,
  CpoTenant,
  CpoTenantProps,
  CredentialsService,
  OcpiToken,
  PostTokenParams,
  ServerCredentialsRoleProps,
  TokensClientApi,
  TokensRepository,
  UnsuccessfulRequestException,
} from '@citrineos/ocpi-base';
import { BadRequestError } from 'routing-controllers';
import { ILogObj, Logger } from 'tslog';
import { AuthorizationInfo } from '@citrineos/ocpi-base/dist/model/AuthorizationInfo';
import { Service } from 'typedi';

@Service()
export class RealTimeAuthorizer implements IAuthorizer {

  constructor(
    private readonly logger: Logger<ILogObj>,
    private readonly tokensRepository: TokensRepository,
    private readonly credentialsService: CredentialsService,
    private readonly tokensClientApi: TokensClientApi
  ) {
  }
  async authorize(authorization: Authorization, context: IMessageContext): Promise<Partial<IdTokenInfoType>> {
    const result = new IdTokenInfo();
    result.status = AuthorizationStatusEnumType.Invalid;
    try {
      const ocpiToken = await this.getOcpiToken(authorization, context);
      const cpoTenant = await this.getCpoTenant(ocpiToken, context);
      const params = this.buildPostTokenParams(authorization, ocpiToken, cpoTenant);
      const authorizationInfo = await this.getPostTokenResponse(params);
      if (authorizationInfo.allowed === AuthorizationInfoAllowed.Allowed) {
        result.status = AuthorizationStatusEnumType.Accepted;
      }
    } catch (e: any) {
      this.logger.error('Error: could not authorize token -' + e.message);
    }
    return result;
  }

  private async getOcpiToken(authorization: Authorization, context: IMessageContext): Promise<OcpiToken> {
    const idToken = authorization.idToken as IdToken;
    const idTokenId = idToken.id;
    const ocpiToken = await this.tokensRepository.getOcpiTokenByAuthorizationId(authorization.id);
    if (!ocpiToken) {
      throw new BadRequestError(`Could not find OCPI token with id ${idTokenId}.`);
    }
    return ocpiToken;
  }

  private async getCpoTenant(ocpiToken: OcpiToken, context: IMessageContext): Promise<CpoTenant> {
    const countryCode = ocpiToken.country_code;
    const partyId = ocpiToken.party_id;
    try {
      return await this.credentialsService.getCpoTenantByClientCountryCodeAndPartyId(
        countryCode,
        partyId,
      );
    } catch (e: any) {
      const msg = `Could not get cpo tenant for provided country code ${countryCode} and party id ${partyId}.` + e.message;
      this.logger.error(msg);
      throw new UnsuccessfulRequestException(msg);
    }
  }

  private async getPostTokenResponse(params: PostTokenParams): Promise<AuthorizationInfo> {
    this.logger.info('Performing Realtime Authorization with params:', {
      ...params,
      authorization: '***',
    });
    const response = await this.tokensClientApi.postToken(params);
    this.logger.info('Realtime Authorization response from MSP:', response);
    const authorizationInfo = response.data;
    if (!authorizationInfo) {
      const msg = `Could not authorization info from client for token id: ${params.tokenId}.`
      this.logger.error(msg);
      throw new BadRequestError(msg);
    }
    return authorizationInfo;
  }

  private buildPostTokenParams(authorization: Authorization, ocpiToken: OcpiToken, cpoTenant: CpoTenant): PostTokenParams {
    const serverCredentialsRoles = cpoTenant[CpoTenantProps.serverCredentialsRoles];
    const clientInformations = cpoTenant[CpoTenantProps.clientInformation];
    const clientInformation = clientInformations[0]; // todo how to handle multiple?
    const authorizationToken = clientInformation[ClientInformationProps.clientToken];
    const serverCredentialsRole = serverCredentialsRoles[0]; // todo how to handle multiple?
    const clientVersions = clientInformation[ClientInformationProps.clientVersionDetails];
    const clientVersion = clientVersions[0]; // todo how to handle multiple?
    return PostTokenParams.build(
      serverCredentialsRole[ServerCredentialsRoleProps.countryCode],
      serverCredentialsRole[ServerCredentialsRoleProps.partyId],
      ocpiToken.country_code,
      ocpiToken.party_id,
      authorizationToken,
      'xRequestId', // todo
      'xCorrelationId', // todo
      clientVersion.version,
      String(authorization.idTokenId),
      ocpiToken.type,
      {
        location_id: 'todo',
        evse_uids: ['todo']
      }, // todo
    )
  }
}
