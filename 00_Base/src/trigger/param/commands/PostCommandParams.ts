import { z } from 'zod';
import { OcpiParamsSchema } from '../../util/OcpiParams';
import { CommandResultSchema } from '../../../model/CommandResult';

export const PostCommandParamsSchema = OcpiParamsSchema.extend({
  url: z.string().min(1),
  commandResult: CommandResultSchema,
});

export type PostCommandParams = z.infer<typeof PostCommandParamsSchema>;
