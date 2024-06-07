export class OcpiModuleConfig {
    // Configuration for routing-controllers.
    routePrefix?: string
    middlewares?: Function[] | string[]
    defaultErrorHandler?: boolean

    constructor(routePrefix?: string, middlewares?: Function[] | string[], defaultErrorHandler?: boolean) {
        this.routePrefix = routePrefix
        this.middlewares = middlewares
        this.defaultErrorHandler = defaultErrorHandler
    }
}
