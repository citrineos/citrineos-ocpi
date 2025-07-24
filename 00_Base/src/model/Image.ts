import { IsInt, IsNotEmpty, IsString, IsUrl, Max } from 'class-validator';
import { Optional } from '../util/decorators/Optional';
import { Exclude } from 'class-transformer';
import { BusinessDetails } from './BusinessDetails';
import { ImageCategory } from './ImageCategory';
import { Enum } from '../util/decorators/Enum';
import { ImageDTO } from './DTO/ImageDTO';
import { ImageType } from './ImageType';

export class Image {
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
}

export const toImageDTO = (image: Image) => {
  const imageDTO = new ImageDTO();
  imageDTO.url = image.url;
  imageDTO.thumbnail = image.thumbnail;
  imageDTO.category = image.category;
  imageDTO.type = image.type;
  imageDTO.width = image.width;
  imageDTO.height = image.height;
  return imageDTO;
};

export const fromImageDTO = (imageDTO: ImageDTO) => {
  return {
    url: imageDTO.url,
    thumbnail: imageDTO.thumbnail,
    category: imageDTO.category,
    type: imageDTO.type,
    width: imageDTO.width,
    height: imageDTO.height,
  };
};
