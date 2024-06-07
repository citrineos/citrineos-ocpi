import {Service} from "typedi";
import {IOcppClient} from "./IOcppClient";

@Service()
export class DefaultOcppClient implements IOcppClient {
    forward(message: object): void {
        console.log(`Forwarding message to OCPP client: ${message}`)
    }
}
