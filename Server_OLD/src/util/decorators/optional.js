"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Optional = exports.OPTIONAL_PARAM = void 0;
const class_validator_1 = require("class-validator");
exports.OPTIONAL_PARAM = 'isOptional';
/**
 * Optional - mimics @IsOptional decorator but adds custom metadata so that it is easily available in
 * Reflect to check if the property is optional and appropriately handle anyOf with $refs when generating OpenApi spec
 */
const Optional = (isOptional = true) => function (object, propertyName) {
    // Apply the standard @IsOptional() decorator
    (0, class_validator_1.IsOptional)()(object, propertyName);
    // Add custom metadata for additional use cases
    Reflect.defineMetadata(exports.OPTIONAL_PARAM, isOptional, object, propertyName);
};
exports.Optional = Optional;
//# sourceMappingURL=optional.js.map