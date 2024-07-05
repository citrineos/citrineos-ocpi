import { OcpiRegistrationParams } from '../../util/ocpi.registration.params';
import { IsNotEmpty } from 'class-validator';

export class PutCredentialsParams extends OcpiRegistrationParams {
  @IsNotEmpty()
  credentials!: { [key: string]: object };
}
