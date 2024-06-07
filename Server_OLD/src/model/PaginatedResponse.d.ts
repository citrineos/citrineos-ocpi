import { OcpiResponse } from './ocpi.response';
export declare const DEFAULT_LIMIT = 10;
export declare const DEFAULT_OFFSET = 0;
export declare class PaginatedResponse<T> extends OcpiResponse<T[]> {
    total?: number;
    offset?: number;
    limit?: number;
}
