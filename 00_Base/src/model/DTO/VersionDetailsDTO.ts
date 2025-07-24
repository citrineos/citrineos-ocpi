import { ArrayMinSize, IsArray, IsNotEmpty } from 'class-validator';
import { Enum } from '../../util/decorators/Enum';
import { VersionNumber } from '../VersionNumber';
import { Type } from 'class-transformer';
import { Endpoint } from '../Endpoint';

export class VersionDetailsDTO {
  @IsNotEmpty()
  @Enum(VersionNumber, 'VersionNumber')
  version!: VersionNumber;

  @IsArray()
  @ArrayMinSize(1)
  @IsNotEmpty()
  @Type(() => Endpoint)
  endpoints!: Endpoint[];
}
