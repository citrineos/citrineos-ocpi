"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaginatedResponse = exports.DEFAULT_OFFSET = exports.DEFAULT_LIMIT = void 0;
const ocpi_response_1 = require("./ocpi.response");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
exports.DEFAULT_LIMIT = 10;
exports.DEFAULT_OFFSET = 0;
class PaginatedResponse extends ocpi_response_1.OcpiResponse {
    constructor() {
        super(...arguments);
        this.offset = exports.DEFAULT_OFFSET;
        this.limit = exports.DEFAULT_LIMIT;
    }
}
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_transformer_1.Exclude)(),
    __metadata("design:type", Number)
], PaginatedResponse.prototype, "total", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.Min)(0),
    (0, class_transformer_1.Exclude)(),
    __metadata("design:type", Number)
], PaginatedResponse.prototype, "offset", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(200) // todo should this setting be in a config??
    ,
    (0, class_transformer_1.Exclude)(),
    __metadata("design:type", Number)
], PaginatedResponse.prototype, "limit", void 0);
exports.PaginatedResponse = PaginatedResponse;
//# sourceMappingURL=PaginatedResponse.js.map