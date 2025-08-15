import { BaseBroadcaster } from './BaseBroadcaster';
import { Service } from 'typedi';
import { CdrsClientApi } from '../trigger/CdrsClientApi';
import { ILogObj, Logger } from 'tslog';
import { CredentialsService } from '../services/CredentialsService';
import { Cdr, CdrResponseSchema } from '../model/Cdr';
import { ModuleId } from '../model/ModuleId';
import { InterfaceRole } from '../model/InterfaceRole';
import { HttpMethod } from '@citrineos/base';

@Service()
export class CdrBroadcaster extends BaseBroadcaster {
  constructor(
    readonly logger: Logger<ILogObj>,
    readonly credentialsService: CredentialsService,
    readonly cdrsClientApi: CdrsClientApi,
  ) {
    super();
  }

  async broadcastPostCdr(cdrDto: Cdr): Promise<void> {
    const cdrId = cdrDto.id;
    if (!cdrId) throw new Error('CDR ID missing');

    const params = { cdrId };

    try {
      await this.cdrsClientApi.broadcastToClients({
        cpoCountryCode: cdrDto.country_code!,
        cpoPartyId: cdrDto.party_id!,
        moduleId: ModuleId.Cdrs,
        interfaceRole: InterfaceRole.SENDER,
        httpMethod: HttpMethod.Post,
        schema: CdrResponseSchema,
        body: cdrDto,
        otherParams: params,
      });
    } catch (e) {
      this.logger.error(`broadcastPostCdr failed for CDR ${cdrId}`, e);
    }
  }
}
