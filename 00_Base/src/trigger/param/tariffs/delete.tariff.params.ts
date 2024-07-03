import { OcpiParams } from '../../util/ocpi.params';
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class DeleteTariffParams extends OcpiParams {
  @IsString()
  @IsNotEmpty()
  @Length(36, 36)
  tariffId!: string;

  static build(tariffId: string) {
    const params = new DeleteTariffParams();
    params.tariffId = tariffId;
    return params;
  }
}
