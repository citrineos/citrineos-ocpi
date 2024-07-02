import {ClientInformationProps} from "../model/ClientInformation";
import {ModuleId} from "../model/ModuleId";
import {ClientCredentialsRoleProps} from "../model/ClientCredentialsRole";
import {ILogObj, Logger} from "tslog";
import {CredentialsService} from "../services/credentials.service";
import {OcpiParams} from "../trigger/util/ocpi.params";
import {BaseClientApi} from "../trigger/BaseClientApi";
import {VersionNumber} from "../model/VersionNumber";

export interface RequiredOcpiParams {
  clientUrl: string;
  authToken: string;
  clientCountryCode: string;
  clientPartyId: string;
}

export class BaseBroadcaster {

  constructor(
    readonly logger: Logger<ILogObj>,
    readonly credentialsService: CredentialsService
  ) {
  }

  protected async getRequiredOcpiParams(
    cpoCountryCode: string,
    cpoPartyId: string,
  ): Promise<RequiredOcpiParams[]> {
    const urlCountryCodeAndPartyIdList: RequiredOcpiParams[] = [];
    const clientInformationList = await this.credentialsService.getClientInformationByServerCountryCodeAndPartyId(cpoCountryCode, cpoPartyId);
    if (!clientInformationList || clientInformationList.length === 0) {
      this.logger.error("clientInformationList empty");
      return urlCountryCodeAndPartyIdList; // todo
    }
    for (let clientInformation of clientInformationList) {
      const clientVersions = await clientInformation.$get(ClientInformationProps.clientVersionDetails);
      if (!clientVersions || clientVersions.length === 0) {
        this.logger.error("clientVersions empty");
        continue;
      }
      const clientCredentialRoles = await clientInformation.$get(ClientInformationProps.clientCredentialsRoles);
      if (!clientCredentialRoles || clientCredentialRoles.length === 0) {
        this.logger.error("clientCredentialRoles empty");
        continue;
      }
      for (let i = 0; i < clientCredentialRoles.length; i++) {
        const clientCredentialRole = clientCredentialRoles[i];
        const clientVersion = clientVersions[i];
        const matchingEndpoint = clientVersion.endpoints.find(
          (endpoint) => endpoint.identifier === ModuleId.Sessions,
        );
        if (
          matchingEndpoint &&
          matchingEndpoint.url &&
          matchingEndpoint.url.length > 0
        ) {
          urlCountryCodeAndPartyIdList.push({
            clientUrl: matchingEndpoint.url,
            authToken: clientInformation[ClientInformationProps.clientToken],
            clientCountryCode: clientCredentialRole[ClientCredentialsRoleProps.countryCode],
            clientPartyId: clientCredentialRole[ClientCredentialsRoleProps.partyId],
          });
        }
      }
    }
    return urlCountryCodeAndPartyIdList;
  }

  protected async broadcastToClients<P extends OcpiParams, C extends BaseClientApi>(
    cpoCountryCode: string,
    cpoPartyId: string,
    params: P,
    clientApi: C,
    requestFunction: (...args: any[]) => Promise<any>,
  ): Promise<void> {
    const requiredOcpiParams = await this.getRequiredOcpiParams(cpoCountryCode, cpoPartyId);
    if (requiredOcpiParams.length === 0) {
      this.logger.error("requiredOcpiParams empty");
      return; // todo
    }
    for (const requiredOcpiParam of requiredOcpiParams) {
      try {
        params.fromCountryCode = cpoCountryCode;
        params.fromPartyId = cpoPartyId;
        params.toCountryCode = requiredOcpiParam.clientCountryCode;
        params.toPartyId = requiredOcpiParam.clientPartyId;
        params.authorization = requiredOcpiParam.authToken;
        params.xRequestId = "xRequestId"; // todo
        params.xCorrelationId = "xCorrelationId"; // todo
        params.version = VersionNumber.TWO_DOT_TWO_DOT_ONE; // todo
        clientApi.baseUrl = requiredOcpiParam.clientUrl;
        const response = await requestFunction(params);
        this.logger.info("broadcastToClients request response: " + response);
      } catch (e) {
        // todo
        this.logger.error(e);
      }
    }
  }
}
