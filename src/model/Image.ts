import {IsInt, IsNotEmpty, IsString, IsUrl, Max,} from 'class-validator';
import {Optional} from '../util/decorators/optional';
import {BelongsTo, Column, DataType, ForeignKey, Model, Table} from "sequelize-typescript";
import {Exclude} from "class-transformer";
import {BusinessDetails} from "./BusinessDetails";
import {Imagecategory} from "./Imagecategory";
import {Enum} from "../util/decorators/enum";

export enum ImageType {
  jpeg = 'jpeg',
  jpg = 'jpg',
  png = 'png'
}

@Table
export class Image extends Model {

  @Column(DataType.STRING)
  @IsString()
  @IsUrl()
  @IsNotEmpty()
  url!: string;

  @Column(DataType.STRING)
  @IsString()
  @IsUrl()
  @Optional()
  thumbnail?: string | null;

  @Column(DataType.ENUM(...Object.keys(Imagecategory)))
  @Enum(Imagecategory, 'Imagecategory')
  @IsNotEmpty()
  category!: Imagecategory;

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

  /* static buildImage(
    url: string,
    thumbnail: string | null,
    category: Imagecategory,
    type: ImageType,
    width: number | null,
    height: number | null
  ) {
    const image = new Image();
    image.url = url;
    image.thumbnail = thumbnail;
    image.category = category;
    image.type = type;
    image.width = width;
    image.height = height;
    return image;
  } */
}
