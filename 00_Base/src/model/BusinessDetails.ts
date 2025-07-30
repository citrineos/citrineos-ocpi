import { z } from 'zod';
import { BusinessDetailsDTO } from './DTO/BusinessDetailsDTO';
import { fromImageDTO, ImageSchema, toImageDTO } from './Image';

export const BusinessDetailsSchema = z.object({
  name: z.string().max(100),
  website: z.string().url().nullable().optional(),
  logo: ImageSchema.nullable().optional(),
});

export type BusinessDetails = z.infer<typeof BusinessDetailsSchema>;

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
): BusinessDetails => {
  const record: any = {
    name: businessDetailsDTO.name,
    website: businessDetailsDTO.website,
  };
  const businessDetails: BusinessDetails = record;
  if (businessDetailsDTO.logo) {
    businessDetails.logo = fromImageDTO(businessDetailsDTO.logo);
  }
  return businessDetails;
};
