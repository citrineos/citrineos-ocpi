import { BaseBroadcaster } from './BaseBroadcaster';
import { Service } from 'typedi';
import { CdrsClientApi } from '../trigger/CdrsClientApi';
import { ILogObj, Logger } from 'tslog';
import { Cdr, CdrResponseSchema } from '../model/Cdr';
import { ModuleId } from '../model/ModuleId';
import { InterfaceRole } from '../model/InterfaceRole';
import { HttpMethod, ITransactionDto } from '@citrineos/base';
import { CdrMapper } from '../mapper';

@Service()
export class CdrBroadcaster extends BaseBroadcaster {
  constructor(
    readonly logger: Logger<ILogObj>,
    readonly cdrMapper: CdrMapper,
    readonly cdrsClientApi: CdrsClientApi,
  ) {
    super();
  }

  async broadcastPostCdr(transactionDto: ITransactionDto): Promise<void> {
    const cdrs: Cdr[] = await this.cdrMapper.mapTransactionsToCdrs([
      transactionDto,
    ]);
    if (cdrs.length === 0) {
      this.logger.warn(
        `No CDRs generated for Transaction: ${transactionDto.transactionId}`,
      );
      return;
    }
    const cdrDto = cdrs[0];

    try {
      await this.cdrsClientApi.broadcastToClients({
        cpoCountryCode: cdrDto.country_code!,
        cpoPartyId: cdrDto.party_id!,
        moduleId: ModuleId.Cdrs,
        interfaceRole: InterfaceRole.SENDER,
        httpMethod: HttpMethod.Post,
        schema: CdrResponseSchema,
        body: cdrDto,
      });
    } catch (e) {
      this.logger.error(`broadcastPostCdr failed for CDR ${cdrDto.id}`, e);
    }
  }
}
