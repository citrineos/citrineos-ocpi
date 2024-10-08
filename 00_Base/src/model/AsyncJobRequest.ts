import { PaginatedParams } from '../controllers/param/PaginatedParams';

export class AsyncJobRequest {
  mspCountryCode!: string;
  mspPartyId!: string;
  cpoCountryCode!: string;
  cpoPartyId!: string;
  paginatedParams!: PaginatedParams;
}
