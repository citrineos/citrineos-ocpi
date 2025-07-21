import { IsNotEmpty, IsString, IsUrl, MaxLength } from 'class-validator';
import { fromImageDTO, Image, toImageDTO } from './Image';
import { Optional } from '../util/decorators/Optional';
import { ClientCredentialsRole } from './ClientCredentialsRole';
import { ServerCredentialsRole } from './ServerCredentialsRole';
import { Exclude } from 'class-transformer';
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

export class BusinessDetails {
  @MaxLength(100)
  @IsString()
  @IsNotEmpty()
  [BusinessDetailsProps.name]!: string;

  @IsString()
  @IsUrl({ require_tld: false })
  @Optional()
  [BusinessDetailsProps.website]?: string | null;

  @Exclude()
  [BusinessDetailsProps.logo]?: Image | null;

  @Exclude()
  [BusinessDetailsProps.clientCredentialsRoleId]!: number;

  @Exclude()
  [BusinessDetailsProps.clientCredentialsRole]!: ClientCredentialsRole;

  @Exclude()
  [BusinessDetailsProps.serverCredentialsRoleId]!: number;

  @Exclude()
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
