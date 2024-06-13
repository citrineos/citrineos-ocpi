import { OcpiResponse, OcpiResponseStatusCode } from '../ocpi.response';
import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { VersionDTO } from './VersionDTO';

export class VersionListResponseDTO extends OcpiResponse<VersionDTO[]> {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VersionDTO)
  data!: VersionDTO[];

  static build(
    data: VersionDTO[],
    statusCode = OcpiResponseStatusCode.GenericSuccessCode,
    status_message?: string,
  ): VersionListResponseDTO {
    const response = new VersionListResponseDTO();
    response.status_code = statusCode;
    response.status_message = status_message;
    response.data = data;
    response.timestamp = new Date();
    return response;
  }
}
