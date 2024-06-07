export declare enum OcpiResponseStatusCode {
    GenericSuccessCode = 1000,
    ClientGenericError = 2000,
    ClientInvalidOrMissingParameters = 2001,
    ClientNotEnoughInformation = 2002,
    ClientUnknownLocation = 2003,
    ClientUnknownToken = 2004,
    ServerGenericError = 3000,
    ServerUnableToUseClientApi = 3001,
    ServerUnsupportedVersion = 3002,
    ServerNoMatchingEndpoints = 3003,
    HubGenericError = 4000,
    HubUnknownReceiver = 4001,
    HubTimeoutOnForwardedMessage = 4002,
    HubConnectionProblem = 4003
}
export declare class OcpiResponse<T> {
    status_code: OcpiResponseStatusCode;
    /**
     *
     * @type {string}
     * @memberof OcpiResponseDTO
     */
    status_message?: string;
    /**
     *
     * @type {string}
     * @memberof OcpiResponseDTO
     */
    timestamp: Date;
    /**
     *
     * @type {object}
     * @memberof OcpiResponseDTO
     */
    data?: T;
}
export declare const buildOcpiResponse: <T>(status_code: OcpiResponseStatusCode, data?: T | undefined, status_message?: string) => OcpiResponse<T>;
