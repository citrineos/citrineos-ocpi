import {IsNotEmpty} from "class-validator";
import {OcpiRegistrationParams} from "../../util/ocpi.registration.params";

export class PutCredentialsParams extends OcpiRegistrationParams {
  @IsNotEmpty()
  credentials!: { [key: string]: object };
}
