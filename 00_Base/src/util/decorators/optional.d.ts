export declare const OPTIONAL_PARAM = "isOptional";
/**
 * Optional - mimics @IsOptional decorator but adds custom metadata so that it is easily available in
 * Reflect to check if the property is optional and appropriately handle anyOf with $refs when generating OpenApi spec
 */
export declare const Optional: (isOptional?: boolean) => (object: NonNullable<unknown>, propertyName: string) => void;
