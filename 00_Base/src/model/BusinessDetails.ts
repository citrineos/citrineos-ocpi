import {IsNotEmpty, IsString, IsUrl, MaxLength} from 'class-validator';
import {Image, toImageDTO} from './Image';
import {Optional} from '../util/decorators/optional';
import {BelongsTo, Column, DataType, ForeignKey, HasOne, Model, Table} from "sequelize-typescript";
import {ClientCredentialsRole} from "./client.credentials.role";
import {ServerCredentialsRole} from "./server.credentials.role";
import {Exclude} from "class-transformer";
import {ON_DELETE_CASCADE} from "../util/sequelize";
import {BusinessDetailsDTO} from "./DTO/BusinessDetailsDTO";

@Table // todo note here need for both client and server credential roles models because using base wont work
export class BusinessDetails extends Model {

  @Column(DataType.STRING(100))
  @MaxLength(100)
  @IsString()
  @IsNotEmpty()
  name!: string;

  @Column(DataType.STRING)
  @IsString()
  @IsUrl({require_tld: false})
  @Optional()
  website?: string | null;

  @Exclude()
  @HasOne(() => Image, {
    onDelete: ON_DELETE_CASCADE,
  })
  logo?: Image | null;

  @Exclude()
  @ForeignKey(() => ClientCredentialsRole)
  @Column(DataType.INTEGER)
  clientCredentialsRoleId!: number;

  @Exclude()
  @BelongsTo(() => ClientCredentialsRole)
  clientCredentialsRole!: ClientCredentialsRole;

  @Exclude()
  @ForeignKey(() => ServerCredentialsRole)
  @Column(DataType.INTEGER)
  serverCredentialsRoleId!: number;

  @Exclude()
  @BelongsTo(() => ServerCredentialsRole)
  serverCredentialsRole!: ServerCredentialsRole;
}

export const toBusinessDetailsDTO = (businessDetails: BusinessDetails) => {
  const businessDetailsDTO = new BusinessDetailsDTO();
  businessDetailsDTO.name = businessDetails.name;
  businessDetailsDTO.website = businessDetails.website;
  businessDetailsDTO.logo = toImageDTO(businessDetails.logo!);
  return businessDetailsDTO;
}

