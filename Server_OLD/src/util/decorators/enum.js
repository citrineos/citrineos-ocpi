"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Enum = void 0;
const class_validator_1 = require("class-validator");
/**
 * Extends @IsEnum decorator to add custom metadata so that it is easily available in additionalConverters and is
 * easily available to convert Swagger UI schema route params to have $refs appropriately
 */
const Enum = (enumType, enumName) => function (object, propertyName) {
    // Apply the standard @IsOptional() decorator
    (0, class_validator_1.IsEnum)(enumType)(object, propertyName);
    // Add custom metadata for additional use cases
    Reflect.defineMetadata('isEnum', enumName, object, propertyName);
};
exports.Enum = Enum;
//# sourceMappingURL=enum.js.map