import {IsNotEmpty} from "class-validator";
import {OcpiRegistrationParams} from "../../../../../00_Base/src/trigger/util/ocpi.registration.params";

export class PutCredentialsParams extends OcpiRegistrationParams {
  @IsNotEmpty()
  credentials!: { [key: string]: object };
}
