import {CommandsClientApi, IOcpiModule, ResponseUrlRepository} from "@citrineos/ocpi-base";
import {
    AbstractModule,
    EventGroup,
    ICache,
    IMessageHandler,
    IMessageSender,
    SystemConfig
} from "@citrineos/base";
import {ILogObj, Logger} from "tslog";
import {Container} from "typedi";
import {CommandsOcppHandlers} from "./handlers";
import {SequelizeTransactionEventRepository} from "@citrineos/data";

export class CommandsModule implements IOcpiModule {
    constructor(
        config: SystemConfig,
        cache: ICache,
        handler: IMessageHandler,
        sender: IMessageSender,
        eventGroup: EventGroup,
        logger?: Logger<ILogObj>,
    ) {
        Container.set(
            AbstractModule,
            new CommandsOcppHandlers(
                config,
                cache,
                Container.get(ResponseUrlRepository),
                Container.get(CommandsClientApi),
                sender,
                handler,
                logger,
            ),
        );

        Container.set(
            SequelizeTransactionEventRepository,
            new SequelizeTransactionEventRepository(config, logger),
        );
    }

    getController(): any {
        return CommandsModuleApi;
    }
}
