import { OcpiResponse, OcpiResponseStatusCode } from '../OcpiResponse';
import { IsNotEmpty, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { VersionDetailsDTO } from './VersionDetailsDTO';

export class VersionDetailsResponseDTO extends OcpiResponse<VersionDetailsDTO> {
  @IsObject()
  @IsNotEmpty()
  @Type(() => VersionDetailsDTO)
  @ValidateNested()
  data!: VersionDetailsDTO;

  static build(
    data: VersionDetailsDTO,
    statusCode = OcpiResponseStatusCode.GenericSuccessCode,
    status_message?: string,
  ): VersionDetailsResponseDTO {
    const response = new VersionDetailsResponseDTO();
    response.status_code = statusCode;
    response.status_message = status_message;
    response.data = data;
    response.timestamp = new Date();
    return response;
  }
}
