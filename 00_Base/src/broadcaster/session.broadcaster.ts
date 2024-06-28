import { Service } from 'typedi';
import { Session } from '../model/Session';
import { SessionsClientApi } from '../trigger/SessionsClientApi';
import { PutSessionParams } from '../trigger/param/sessions/put.session.params';
import {
  SequelizeTransactionEventRepository,
  Transaction,
} from '@citrineos/data';
import { SessionMapper } from '../mapper/session.mapper';
import { CredentialsService } from '../services/credentials.service';
import { ClientInformationProps } from '../model/ClientInformation';
import { ModuleId } from '../model/ModuleId';
import { ClientVersion } from '../model/ClientVersion';
import { NotFoundError } from 'routing-controllers';

@Service()
export class SessionBroadcaster {
  constructor(
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
    const params = PutSessionParams.build(
      session.country_code,
      session.party_id,
      session.cdr_token.country_code,
      session.cdr_token.party_id,
      session.id,
      session,
    );

    try {
      const clientInformation =
        await this.credentialsService.getClientInformationByClientCountryCodeAndPartyId(
          session.cdr_token.country_code,
          session.cdr_token.party_id,
        );
      const clientAuthorizationToken =
        clientInformation[ClientInformationProps.clientToken];
      const clientVersionList: ClientVersion[] =
        clientInformation[ClientInformationProps.clientVersionDetails];
      // todo is this correct that we broadcast to all ClientVersions that we have?
      const clientSessionsModuleUrls = clientVersionList.reduce(
        (acc: string[], clientVersion: ClientVersion) => {
          const sessionsEndpoint = clientVersion.endpoints.find(
            (endpoint) => endpoint.identifier === ModuleId.Sessions,
          );
          if (
            sessionsEndpoint &&
            sessionsEndpoint.url &&
            sessionsEndpoint.url.length > 0
          ) {
            acc.push(sessionsEndpoint.url);
          }
        },
        [],
      ) as string[];
      if (!clientSessionsModuleUrls || clientSessionsModuleUrls.length === 0) {
        const msg = `Could not find clientSessionsModuleUrls for client of country code ${session.cdr_token.country_code} and party id ${session.cdr_token.party_id}`;
        console.debug(msg);
        throw new NotFoundError(msg);
      }

      for (const clientSessionsModuleUrl of clientSessionsModuleUrls) {
        this.sessionsClientApi.baseUrl = clientSessionsModuleUrl;
        await this.sessionsClientApi.putSession(params);
      }
    } catch (e) {
      // todo
    }
  }
}
