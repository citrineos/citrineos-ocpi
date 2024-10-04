import { IsInt, IsNotEmpty, IsString, IsUrl, Max } from 'class-validator';
import { Optional } from '../util/decorators/Optional';
import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from '@citrineos/data';
import { Exclude } from 'class-transformer';
import { BusinessDetails } from './BusinessDetails';
import { ImageCategory } from './ImageCategory';
import { Enum } from '../util/decorators/Enum';
import { ImageDTO } from './DTO/ImageDTO';
import { ImageType } from './ImageType';

@Table
export class Image extends Model {
  @Column(DataType.STRING)
  @IsString()
  @IsUrl({ require_tld: false })
  @IsNotEmpty()
  url!: string;

  @Column(DataType.STRING)
  @IsString()
  @IsUrl({ require_tld: false })
  @Optional()
  thumbnail?: string | null;

  @Column(DataType.ENUM(...Object.keys(ImageCategory)))
  @Enum(ImageCategory, 'ImageCategory')
  @IsNotEmpty()
  category!: ImageCategory;

  @Column(DataType.ENUM(...Object.keys(ImageType)))
  @Enum(ImageType, 'ImageType')
  @IsNotEmpty()
  type!: ImageType;

  @Column(DataType.INTEGER)
  @Max(99999)
  @IsInt()
  @Optional()
  width?: number | null;

  @Column(DataType.INTEGER)
  @Max(99999)
  @IsInt()
  @Optional()
  height?: number | null;

  @Exclude()
  @ForeignKey(() => BusinessDetails)
  @Column(DataType.INTEGER)
  businessDetailsId!: number;

  @Exclude()
  @BelongsTo(() => BusinessDetails)
  businessDetails!: BusinessDetails;
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

export const fromImageDTO = (imageDTO: ImageDTO) =>
  Image.build({
    url: imageDTO.url,
    thumbnail: imageDTO.thumbnail,
    category: imageDTO.category,
    type: imageDTO.type,
    width: imageDTO.width,
    height: imageDTO.height,
  });
