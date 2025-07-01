import { IsNotEmpty, IsString, IsUrl, MaxLength, ValidateNested } from 'class-validator';
import { Optional } from '../../util/decorators/Optional';
import { Type } from 'class-transformer';
import { ImageDTO } from './ImageDTO';

export class BusinessDetailsDTO {
  @MaxLength(100)
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsUrl({ require_tld: false })
  @Optional()
  website?: string | null;

  @Optional()
  @Type(() => ImageDTO)
  @ValidateNested()
  logo?: ImageDTO | null;

  static build(
    name: string,
    website: string | null,
    logo: ImageDTO | null,
  ): BusinessDetailsDTO {
    const businessDetails = new BusinessDetailsDTO();
    businessDetails.name = name;
    businessDetails.website = website;
    businessDetails.logo = logo;
    return businessDetails;
  }
}
