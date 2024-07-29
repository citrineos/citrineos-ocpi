import { Session } from '../model/Session';
import { PaginatedResult } from '../model/PaginatedResult';

export interface ISessionsDatasource {
  getSessions(
    cpoCountryCode: string,
    cpoPartyId: string,
    mspCountryCode: string,
    mspPartyId: string,
    dateFrom?: Date,
    dateTo?: Date,
    offset?: number,
    limit?: number,
  ): Promise<PaginatedResult<Session>>;
}
