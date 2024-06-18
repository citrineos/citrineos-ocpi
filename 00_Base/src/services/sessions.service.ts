import { Service } from "typedi";
import { PaginatedSessionResponse, Session } from "../model/Session";
import {
  Evse,
  MeterValue,
  SequelizeLocationRepository,
  SequelizeTransactionEventRepository,
  Transaction,
  TransactionEvent,
} from "../../../../citrineos-core/01_Data/src/layers/sequelize";
import { Op } from "sequelize";
import { DEFAULT_LIMIT, DEFAULT_OFFSET } from "../model/PaginatedResponse";
import { SessionMapper } from '../mapper/session.mapper';

@Service()
export class SessionsService {
  constructor(
    readonly transactionRepository: SequelizeTransactionEventRepository,
    readonly locationRepository: SequelizeLocationRepository,
    readonly sessionMapper: SessionMapper
  ) {
  }

  public async getSessions(
    fromCountryCode: string,
    fromPartyId: string,
    toCountryCode: string,
    toPartyId: string,
    dateFrom: Date,
    dateTo?: Date,
    offset: number = DEFAULT_OFFSET,
    limit: number = DEFAULT_LIMIT,
  ): Promise<PaginatedSessionResponse> {
    const where: any = {
      updatedAt: {
        [Op.gte]: dateFrom,
        [Op.lt]: dateTo || new Date(),
      },
    };

    const transactions =
      await this.transactionRepository.transaction.readAllByQuery({
        where,
        offset,
        limit,
        include: [TransactionEvent, MeterValue, Evse],
      });

    const sessions: Session[] = transactions.map((transaction) => this.sessionMapper.mapTransactionToSession(fromCountryCode, fromPartyId, toCountryCode, toPartyId, transaction));

    const total = await Transaction.count({where});
    const response = new PaginatedSessionResponse();
    response.data = sessions;
    response.total = total;
    response.offset = offset;
    response.limit = limit;

    return response;
  }
}
