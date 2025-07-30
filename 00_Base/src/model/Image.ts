import { ImageCategory } from './ImageCategory';
import { ImageDTO } from './DTO/ImageDTO';
import { ImageType } from './ImageType';

import { z } from 'zod';

export const ImageSchema = z.object({
  url: z.string().url(),
  thumbnail: z.string().url().nullable().optional(),
  category: z.nativeEnum(ImageCategory),
  type: z.nativeEnum(ImageType),
  width: z.number().int().max(99999).nullable().optional(),
  height: z.number().int().max(99999).nullable().optional(),
});

export type Image = z.infer<typeof ImageSchema>;

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

export const fromImageDTO = (imageDTO: ImageDTO): Image => {
  return {
    url: imageDTO.url,
    thumbnail: imageDTO.thumbnail,
    category: imageDTO.category,
    type: imageDTO.type,
    width: imageDTO.width,
    height: imageDTO.height,
  };
};
