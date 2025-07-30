import { z } from 'zod';

export const TokenEnergyContractSchema = z.object({
  supplier_name: z.string().max(64),
  contract_id: z.string().max(64).nullable().optional(),
});

export type TokenEnergyContract = z.infer<typeof TokenEnergyContractSchema>;
