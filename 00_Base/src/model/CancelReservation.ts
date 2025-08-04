import { z } from 'zod';
import { ResponseUrlSchema } from './ResponseUrl';

export const CancelReservationSchema = ResponseUrlSchema.extend({
  reservation_id: z.string().max(36),
});
export const CancelReservationSchemaName = 'CancelReservation';

export type CancelReservation = z.infer<typeof CancelReservationSchema>;
