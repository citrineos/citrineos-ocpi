import {
  AuthorizationStatusEnumType,
  IdTokenInfoType,
  IMessageContext,
} from '@citrineos/base';
import { Authorization, IdToken, IdTokenInfo } from '@citrineos/data';
import { IAuthorizer } from '@citrineos/util';
import {
  AuthorizationInfoAllowed,
  ClientInformationProps,
  CpoTenant,
  CpoTenantProps,
  CredentialsService,
  ModuleId,
  OcpiToken,
  PostTokenParams,
  ServerCredentialsRoleProps,
  TokensClientApi,
  UnsuccessfulRequestException,
  WhitelistType,
} from '@citrineos/ocpi-base';
import { BadRequestError } from 'routing-controllers';
import { ILogObj, Logger } from 'tslog';
import { AuthorizationInfo } from '@citrineos/ocpi-base/dist/model/AuthorizationInfo';
import { Service } from 'typedi';
import {TokensDatasource} from "@citrineos/ocpi-base/dist/datasources/TokensDatasource";

@Service()
export class RealTimeAuthorizer implements IAuthorizer {
  constructor(
    private readonly logger: Logger<ILogObj>,
    private readonly tokensDatasource: TokensDatasource,
    private readonly credentialsService: CredentialsService,
    private readonly tokensClientApi: TokensClientApi,
  ) {}
  async authorize(
    authorization: Authorization,
    _context: IMessageContext,
  ): Promise<Partial<IdTokenInfoType>> {
    const result = {} as Partial<IdTokenInfo>;
    result.status = AuthorizationStatusEnumType.Invalid;
    try {
      const ocpiToken = await this.getOcpiToken(authorization);
      if (
        ocpiToken.whitelist === WhitelistType.ALWAYS ||
        ocpiToken.whitelist === WhitelistType.ALLOWED
      ) {
        result.status = AuthorizationStatusEnumType.Accepted;
      } else if (ocpiToken.whitelist === WhitelistType.ALLOWED_OFFLINE) {
        try {
          await this.performAndRealTimeAuthUpdateResult(
            result,
            ocpiToken,
            authorization,
          );
        } catch (e: any) {
          this.logger.error(
            'Issue performing real-time authorization - permitting because whitelist type is ALLOWED_OFFLINE. Error:' +
              e.message,
          );
          result.status = AuthorizationStatusEnumType.Accepted;
        }
      } else {
        // NEVER
        await this.performAndRealTimeAuthUpdateResult(
          result,
          ocpiToken,
          authorization,
        );
      }
    } catch (e: any) {
      this.logger.error('Error: could not authorize token -' + e.message);
    }
    return result;
  }

  private async performAndRealTimeAuthUpdateResult(
    result: Partial<IdTokenInfo>,
    ocpiToken: OcpiToken,
    authorization: Authorization,
  ) {
    const cpoTenant = await this.getCpoTenant(ocpiToken);
    const params = this.buildPostTokenParams(
      authorization,
      ocpiToken,
      cpoTenant,
    );
    const authorizationInfo = await this.getPostTokenResponse(
      params,
      cpoTenant,
    );
    if (authorizationInfo.allowed === AuthorizationInfoAllowed.Allowed) {
      result.status = AuthorizationStatusEnumType.Accepted;
    }
  }

  private async getOcpiToken(authorization: Authorization): Promise<OcpiToken> {
    const idToken = authorization.idToken as IdToken;
    const idTokenId = idToken.id;
    const ocpiToken = await this.tokensDatasource.getOcpiTokenByAuthorizationId(
      authorization.id,
    );
    if (!ocpiToken) {
      throw new BadRequestError(
        `Could not find OCPI token with id ${idTokenId}.`,
      );
    }
    return ocpiToken;
  }

  private async getCpoTenant(ocpiToken: OcpiToken): Promise<CpoTenant> {
    const countryCode = ocpiToken.country_code;
    const partyId = ocpiToken.party_id;
    try {
      return await this.credentialsService.getCpoTenantByClientCountryCodeAndPartyId(
        countryCode,
        partyId,
      );
    } catch (e: any) {
      const msg =
        `Could not get cpo tenant for provided country code ${countryCode} and party id ${partyId}.` +
        e.message;
      this.logger.error(msg);
      throw new UnsuccessfulRequestException(msg);
    }
  }

  private async getPostTokenResponse(
    params: PostTokenParams,
    cpoTenant: CpoTenant,
  ): Promise<AuthorizationInfo> {
    this.logger.info('Performing Realtime Authorization with params:', {
      ...params,
      authorization: '***',
    });
    const clientInformations = cpoTenant[CpoTenantProps.clientInformation];
    const clientInformation = clientInformations[0]; // todo how to handle multiple?
    const clientVersionDetails =
      clientInformation[ClientInformationProps.clientVersionDetails];
    const clientVersion = clientVersionDetails[0]; // todo how to handle multiple?
    const endpoints = clientVersion.endpoints;
    const tokensEndpoint = endpoints.find(
      (endpoint) => endpoint.identifier === ModuleId.Tokens,
    );
    this.tokensClientApi.baseUrl = tokensEndpoint!.url;
    const response = await this.tokensClientApi.postToken(params);
    this.logger.info('Realtime Authorization response from MSP:', response);
    if (!response || !response.data) {
      const msg = `Could not authorization info from client for token id: ${params.tokenId}.`;
      this.logger.error(msg);
      throw new BadRequestError(msg);
    }
    return response.data;
  }

  private buildPostTokenParams(
    authorization: Authorization,
    ocpiToken: OcpiToken,
    cpoTenant: CpoTenant,
  ): PostTokenParams {
    const serverCredentialsRoles =
      cpoTenant[CpoTenantProps.serverCredentialsRoles];
    const clientInformations = cpoTenant[CpoTenantProps.clientInformation];
    const clientInformation = clientInformations[0]; // todo how to handle multiple?
    const authorizationToken =
      clientInformation[ClientInformationProps.clientToken];
    const serverCredentialsRole = serverCredentialsRoles[0]; // todo how to handle multiple?
    const clientVersions =
      clientInformation[ClientInformationProps.clientVersionDetails];
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
        evse_uids: ['todo'],
      }, // todo
    );
  }
}
