/**
 * Extends @IsEnum decorator to add custom metadata so that it is easily available in additionalConverters and is
 * easily available to convert Swagger UI schema route params to have $refs appropriately
 */
export declare const Enum: (enumType: any, enumName: string) => (object: NonNullable<unknown>, propertyName: string) => void;
