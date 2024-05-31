import {IsDateString, IsInt, IsPositive, Min} from 'class-validator';
import {Optional} from '../../util/decorators/optional';
import {DEFAULT_LIMIT, DEFAULT_OFFSET} from "../../model/PaginatedResponse";

export class PaginatedParams {
  @IsDateString()
  @Optional()
  private _date_from?: string;
  get date_from(): Date | undefined {
    return this._date_from ? new Date(this._date_from) : undefined;
  }

  set date_from(value: Date) {
    this._date_from = value.toISOString();
  }

  @IsDateString()
  @Optional()
  private _date_to?: string;
  get date_to(): Date | undefined {
    return this._date_to ? new Date(this._date_to) : undefined;
  }

  set date_to(value: Date) {
    this._date_to = value.toISOString();
  }

  @IsInt()
  @Min(0)
  @Optional()
  offset?: number = DEFAULT_OFFSET;

  @IsInt()
  @IsPositive()
  @Optional()
  limit?: number = DEFAULT_LIMIT;
}
