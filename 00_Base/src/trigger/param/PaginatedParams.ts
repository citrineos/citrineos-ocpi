import { IsDate, IsInt, Min } from 'class-validator';
import { Optional } from '../../util/decorators/Optional';
import { DEFAULT_LIMIT, DEFAULT_OFFSET } from '../../model/PaginatedResponse';

export class PaginatedParams {
  @IsInt()
  @Min(0)
  @Optional()
  offset?: number = DEFAULT_OFFSET;

  @IsInt()
  @Min(1)
  @Optional()
  limit?: number = DEFAULT_LIMIT;

  @IsDate()
  @Optional()
  private _date_from?: Date;

  @IsDate()
  @Optional()
  private _date_to?: Date;

  get date_from(): Date {
    return new Date(this._date_from!);
  }

  get date_to(): Date {
    return new Date(this._date_to!);
  }

  set date_from(value: string | Date | undefined) {
    this._date_from = value ? new Date(value) : undefined;
  }

  set date_to(value: string | Date | undefined) {
    this._date_to = value ? new Date(value) : undefined;
  }
}

export const buildPaginatedParams = (
  offset?: number,
  limit?: number,
  dateFrom?: Date,
  dateTo?: Date,
): PaginatedParams => {
  const params = new PaginatedParams();
  params.limit = limit ?? DEFAULT_LIMIT;
  params.offset = offset ?? DEFAULT_OFFSET;
  if (dateFrom) {
    params.date_from = dateFrom;
  }
  if (dateTo) {
    params.date_to = dateTo;
  }
  return params;
};
