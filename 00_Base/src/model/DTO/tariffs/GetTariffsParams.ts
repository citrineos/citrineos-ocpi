export interface GetTariffsParams {
  limit: number;
  offset: number;
  dateFrom?: Date;
  dateTo?: Date;
  cpoCountryCode?: string;
  cpoPartyId?: string;
}

export function buildGetTariffsParams(
  limit: number,
  offset: number,
  dateFrom?: Date,
  dateTo?: Date,
  cpoCountryCode?: string,
  cpoPartyId?: string,
): GetTariffsParams {
  return {
    limit,
    offset,
    ...dateFrom && {dateFrom},
    ...dateTo && {dateTo},
    ...cpoCountryCode && {cpoCountryCode},
    ...cpoPartyId && {cpoPartyId},
  };
}