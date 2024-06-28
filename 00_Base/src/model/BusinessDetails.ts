import { IsNotEmpty, IsString, IsUrl, MaxLength } from 'class-validator';
import { fromImageDTO, Image, toImageDTO } from './Image';
import { Optional } from '../util/decorators/optional';
import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  HasOne,
  Model,
  Table,
} from '@citrineos/data';
import { ClientCredentialsRole } from './ClientCredentialsRole';
import { ServerCredentialsRole } from './ServerCredentialsRole';
import { Exclude } from 'class-transformer';
import { ON_DELETE_CASCADE } from '../util/sequelize';
import { BusinessDetailsDTO } from './DTO/BusinessDetailsDTO';

export enum BusinessDetailsProps {
  name = 'name',
  website = 'website',
  logo = 'logo',
  clientCredentialsRoleId = 'clientCredentialsRoleId',
  clientCredentialsRole = 'clientCredentialsRole',
  serverCredentialsRoleId = 'serverCredentialsRoleId',
  serverCredentialsRole = 'serverCredentialsRole',
}

@Table // todo note here need for both client and server credential roles models because using base wont work
export class BusinessDetails extends Model {
  @Column(DataType.STRING(100))
  @MaxLength(100)
  @IsString()
  @IsNotEmpty()
  [BusinessDetailsProps.name]!: string;

  @Column({
    type: DataType.STRING,
    field: BusinessDetailsProps.website,
  })
  @IsString()
  @IsUrl({ require_tld: false })
  @Optional()
  [BusinessDetailsProps.website]?: string | null;

  @Exclude()
  @HasOne(() => Image, {
    onDelete: ON_DELETE_CASCADE,
  })
  [BusinessDetailsProps.logo]?: Image | null;

  @Exclude()
  @ForeignKey(() => ClientCredentialsRole)
  @Column(DataType.INTEGER)
  [BusinessDetailsProps.clientCredentialsRoleId]!: number;

  @Exclude()
  @BelongsTo(() => ClientCredentialsRole)
  [BusinessDetailsProps.clientCredentialsRole]!: ClientCredentialsRole;

  @Exclude()
  @ForeignKey(() => ServerCredentialsRole)
  @Column(DataType.INTEGER)
  [BusinessDetailsProps.serverCredentialsRoleId]!: number;

  @Exclude()
  @BelongsTo(() => ServerCredentialsRole)
  [BusinessDetailsProps.serverCredentialsRole]!: ServerCredentialsRole;
}

export const toBusinessDetailsDTO = (businessDetails: BusinessDetails) => {
  const businessDetailsDTO = new BusinessDetailsDTO();
  businessDetailsDTO.name = businessDetails.name;
  businessDetailsDTO.website = businessDetails.website;
  if (businessDetails.logo) {
    businessDetailsDTO.logo = toImageDTO(businessDetails.logo);
  }
  return businessDetailsDTO;
};

export const fromBusinessDetailsDTO = (
  businessDetailsDTO: BusinessDetailsDTO,
) => {
  const record: any = {
    name: businessDetailsDTO.name,
    website: businessDetailsDTO.website,
  };
  const businessDetails = BusinessDetails.build(record, {
    include: [Image],
  });
  if (businessDetailsDTO.logo) {
    businessDetails.setDataValue('logo', fromImageDTO(businessDetailsDTO.logo));
  }
  return businessDetails;
};
