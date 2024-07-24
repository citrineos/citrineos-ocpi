import { PaginatedParams } from '../controllers/param/paginated.params';

export class AsyncJobRequest {
  mspCountryCode!: string;
  mspPartyId!: string;
  cpoCountryCode!: string;
  cpoPartyId!: string;
  paginatedParams!: PaginatedParams;
}
