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
exports.buildOcpiResponse = exports.OcpiResponse = exports.OcpiResponseStatusCode = void 0;
const class_validator_1 = require("class-validator");
const optional_1 = require("../util/decorators/optional");
const enum_1 = require("../util/decorators/enum");
var OcpiResponseStatusCode;
(function (OcpiResponseStatusCode) {
    OcpiResponseStatusCode[OcpiResponseStatusCode["GenericSuccessCode"] = 1000] = "GenericSuccessCode";
    OcpiResponseStatusCode[OcpiResponseStatusCode["ClientGenericError"] = 2000] = "ClientGenericError";
    OcpiResponseStatusCode[OcpiResponseStatusCode["ClientInvalidOrMissingParameters"] = 2001] = "ClientInvalidOrMissingParameters";
    OcpiResponseStatusCode[OcpiResponseStatusCode["ClientNotEnoughInformation"] = 2002] = "ClientNotEnoughInformation";
    OcpiResponseStatusCode[OcpiResponseStatusCode["ClientUnknownLocation"] = 2003] = "ClientUnknownLocation";
    OcpiResponseStatusCode[OcpiResponseStatusCode["ClientUnknownToken"] = 2004] = "ClientUnknownToken";
    OcpiResponseStatusCode[OcpiResponseStatusCode["ServerGenericError"] = 3000] = "ServerGenericError";
    OcpiResponseStatusCode[OcpiResponseStatusCode["ServerUnableToUseClientApi"] = 3001] = "ServerUnableToUseClientApi";
    OcpiResponseStatusCode[OcpiResponseStatusCode["ServerUnsupportedVersion"] = 3002] = "ServerUnsupportedVersion";
    OcpiResponseStatusCode[OcpiResponseStatusCode["ServerNoMatchingEndpoints"] = 3003] = "ServerNoMatchingEndpoints";
    OcpiResponseStatusCode[OcpiResponseStatusCode["HubGenericError"] = 4000] = "HubGenericError";
    OcpiResponseStatusCode[OcpiResponseStatusCode["HubUnknownReceiver"] = 4001] = "HubUnknownReceiver";
    OcpiResponseStatusCode[OcpiResponseStatusCode["HubTimeoutOnForwardedMessage"] = 4002] = "HubTimeoutOnForwardedMessage";
    OcpiResponseStatusCode[OcpiResponseStatusCode["HubConnectionProblem"] = 4003] = "HubConnectionProblem";
})(OcpiResponseStatusCode = exports.OcpiResponseStatusCode || (exports.OcpiResponseStatusCode = {}));
class OcpiResponse {
}
__decorate([
    (0, enum_1.Enum)(OcpiResponseStatusCode, 'OcpiResponseStatusCode'),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Number)
], OcpiResponse.prototype, "status_code", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, optional_1.Optional)(),
    __metadata("design:type", String)
], OcpiResponse.prototype, "status_message", void 0);
__decorate([
    (0, class_validator_1.IsDate)(),
    __metadata("design:type", Date)
], OcpiResponse.prototype, "timestamp", void 0);
__decorate([
    (0, optional_1.Optional)(),
    __metadata("design:type", Object)
], OcpiResponse.prototype, "data", void 0);
exports.OcpiResponse = OcpiResponse;
const buildOcpiResponse = (status_code, data, status_message) => {
    const response = new OcpiResponse();
    response.status_code = status_code;
    response.status_message = status_message;
    response.data = data;
    response.timestamp = new Date();
    return response;
};
exports.buildOcpiResponse = buildOcpiResponse;
//# sourceMappingURL=ocpi.response.js.map