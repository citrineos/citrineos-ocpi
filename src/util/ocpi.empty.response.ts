import {IsDateString, IsNotEmpty, IsString, ValidateNested,} from 'class-validator';
import {Optional} from './decorators/optional';
import {OcpiResponseStatusCode} from "./ocpi.response";
import {Enum} from "./decorators/enum";

export class OcpiEmptyResponse {
  @Optional()
  @ValidateNested() // needed for json schema
  data?: null;

  @Enum(OcpiResponseStatusCode, 'OcpiResponseStatusCode')
  @IsNotEmpty()
  status_code!: OcpiResponseStatusCode;

  @Optional()
  status_message?: null;

  @IsString()
  @IsDateString()
  @IsNotEmpty()
  timestamp!: Date;

  static build(status_code: OcpiResponseStatusCode): OcpiEmptyResponse {
    const response = new OcpiEmptyResponse();
    response.status_code = status_code;
    response.timestamp = new Date();
    return response;
  }
}
