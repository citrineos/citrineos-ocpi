import {OcpiResponse, OcpiResponseStatusCode} from "./ocpi.response";
import {IsNotEmpty, IsObject, ValidateNested} from "class-validator";
import {Type} from "class-transformer";
import {CredentialsDTO} from "./CredentialsDTO";

export class CredentialsResponse extends OcpiResponse<CredentialsDTO> {
  @IsObject()
  @IsNotEmpty()
  @Type(() => CredentialsDTO)
  @ValidateNested()
  data!: CredentialsDTO;

  static build(
    data: CredentialsDTO,
    status_code = OcpiResponseStatusCode.GenericSuccessCode,
    status_message?: string,
  ) {
    const response = new CredentialsResponse();
    response.status_code = status_code;
    response.status_message = status_message;
    response.data = data;
    response.timestamp = new Date();
    return response;
  }
}
