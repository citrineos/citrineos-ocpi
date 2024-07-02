import {Service} from 'typedi';
import {Session} from '../model/Session';
import {SessionsClientApi} from '../trigger/SessionsClientApi';
import {PutSessionParams} from '../trigger/param/sessions/put.session.params';
import {SequelizeTransactionEventRepository, Transaction,} from '@citrineos/data';
import {SessionMapper} from '../mapper/session.mapper';
import {CredentialsService} from '../services/credentials.service';
import {ClientInformationProps} from '../model/ClientInformation';
import {ModuleId} from '../model/ModuleId';
import {ILogObj, Logger} from "tslog";
import {ClientCredentialsRoleProps} from "../model/ClientCredentialsRole";

interface UrlCountryCodeAndPartyId {
  url: string;
  countryCode: string;
  partyId: string;
}

@Service()
export class SessionBroadcaster {
  constructor(
    private readonly logger: Logger<ILogObj>,
    private readonly transactionRepository: SequelizeTransactionEventRepository,
    private readonly sessionMapper: SessionMapper,
    private readonly sessionsClientApi: SessionsClientApi,
    private readonly credentialsService: CredentialsService,
  ) {
    this.transactionRepository.transaction.on('created', (transactions) =>
      this.broadcast(transactions),
    );
    this.transactionRepository.transaction.on('updated', (transactions) =>
      this.broadcast(transactions),
    );
  }

  private async broadcast(transactions: Transaction[]) {
    // todo do we know if we can do put vs patch here, is there a way to have a delta?
    const sessions: Session[] =
      await this.sessionMapper.mapTransactionsToSessions(transactions);

    for (const session of sessions) {
      await this.sendSessionToClient(session);
    }
  }

  private async sendSessionToClient(session: Session): Promise<void> {
    const cpoCountryCode = session.country_code;
    const cpoPartyId = session.party_id;
    const urlCountryCodeAndPartyIdList: UrlCountryCodeAndPartyId[] = [];
    const clientInformationList = await this.credentialsService.getClientInformationByServerCountryCodeAndPartyId(cpoCountryCode, cpoPartyId);
    if (!clientInformationList || clientInformationList.length === 0) {
      this.logger.error("clientInformationList empty");
      return; // todo
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
        const sessionsEndpoint = clientVersion.endpoints.find(
          (endpoint) => endpoint.identifier === ModuleId.Sessions,
        );
        if (
          sessionsEndpoint &&
          sessionsEndpoint.url &&
          sessionsEndpoint.url.length > 0
        ) {
          urlCountryCodeAndPartyIdList.push({
            url: sessionsEndpoint.url,
            countryCode: clientCredentialRole[ClientCredentialsRoleProps.countryCode],
            partyId: clientCredentialRole[ClientCredentialsRoleProps.partyId],
          });
        }
      }
    }
    if (urlCountryCodeAndPartyIdList.length === 0) {
      this.logger.error("urlCountryCodeAndPartyIdList empty");
      return; // todo
    }

    for (const urlCountryCodeAndPartyId of urlCountryCodeAndPartyIdList) {
      try {
        const params = PutSessionParams.build(
          session.country_code,
          session.party_id,
          urlCountryCodeAndPartyId.countryCode,
          urlCountryCodeAndPartyId.partyId,
          session.id,
          session,
        );
        this.sessionsClientApi.baseUrl = urlCountryCodeAndPartyId.url;
        const response = await this.sessionsClientApi.putSession(params);
        this.logger.info("putSession response: " + response);
      } catch (e) {
        // todo
        this.logger.error(e);
      }
    }


  }
}
