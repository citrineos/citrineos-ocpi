import { IsInt, IsNotEmpty, IsString, IsUrl, Max } from 'class-validator';
import { Optional } from '../../util/decorators/Optional';
import { Enum } from '../../util/decorators/Enum';
import { ImageCategory } from '../ImageCategory';
import { ImageType } from '../ImageType';

export class ImageDTO {
  @IsString()
  @IsUrl({ require_tld: false })
  @IsNotEmpty()
  url!: string;

  @IsString()
  @IsUrl({ require_tld: false })
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

  static build(
    url: string,
    thumbnail: string | null,
    category: ImageCategory,
    type: ImageType,
    width: number | null,
    height: number | null,
  ): ImageDTO {
    const image = new ImageDTO();
    image.url = url;
    image.thumbnail = thumbnail;
    image.category = category;
    image.type = type;
    image.width = width;
    image.height = height;
    return image;
  }
}
