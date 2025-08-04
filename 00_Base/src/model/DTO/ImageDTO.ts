import { z } from 'zod';
import { ImageCategory } from '../ImageCategory';
import { ImageType } from '../ImageType';

export const ImageDTOSchema = z.object({
  url: z.string().url(),
  thumbnail: z.string().url().nullable().optional(),
  category: z.nativeEnum(ImageCategory),
  type: z.nativeEnum(ImageType),
  width: z.number().int().max(99999).nullable().optional(),
  height: z.number().int().max(99999).nullable().optional(),
});

export type ImageDTO = z.infer<typeof ImageDTOSchema>;
