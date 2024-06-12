import {IsInt, IsNotEmpty, IsString, IsUrl, Max} from "class-validator";
import {Optional} from "../../util/decorators/optional";
import {Enum} from "../../util/decorators/enum";
import {ImageCategory} from "../ImageCategory";
import {ImageType} from "../ImageType";

export class ImageDTO {

  @IsString()
  @IsUrl({require_tld: false})
  @IsNotEmpty()
  url!: string;

  @IsString()
  @IsUrl({require_tld: false})
  @Optional()
  thumbnail?: string | null;

  @Enum(ImageCategory, 'ImageCategory')
  @IsNotEmpty()
  category!: ImageCategory;

  @Enum(ImageType, 'ImageType')
  @IsNotEmpty()
  type!: ImageType;

  @Max(99999)
  @IsInt()
  @Optional()
  width?: number | null;

  @Max(99999)
  @IsInt()
  @Optional()
  height?: number | null;

}
