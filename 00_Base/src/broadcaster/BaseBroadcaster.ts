import {ClientInformationProps} from "../model/ClientInformation";
import {ModuleId} from "../model/ModuleId";
import {ClientCredentialsRoleProps} from "../model/ClientCredentialsRole";
import {ILogObj, Logger} from "tslog";
import {CredentialsService} from "../services/credentials.service";

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
}
