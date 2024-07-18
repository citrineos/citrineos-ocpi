import { PaginatedResult } from '../model/PaginatedResult';
import { Cdr } from '../model/Cdr';

export interface ICdrsDatasource {
  getCdrs(
    cpoCountryCode: string,
    cpoPartyId: string,
    mspCountryCode: string,
    mspPartyId: string,
    dateFrom?: Date,
    dateTo?: Date,
    offset?: number,
    limit?: number
  ): Promise<PaginatedResult<Cdr>>;
}