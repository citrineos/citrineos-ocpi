import {StartSession} from "./StartSession";
import {CallAction} from "@citrineos/base";
import {Service} from "typedi";
import {StopSession} from "./StopSession";
import {UnlockConnector} from "./UnlockConnector";
import {ReserveNow} from "./ReserveNow";
import {CancelReservation} from "./CancelReservation";
// import {OcppClient} from "@citrineos/base";

@Service()
export class CommandExecutor {
    // constructor(readonly ocppClient: OcppClient) {}


    public execute(payload: StartSession | StopSession | CancelReservation | ReserveNow | UnlockConnector): void {
        if (payload instanceof StartSession) {
            this.handleStartSession(payload);
        }
    }

    private handleStartSession(payload: StartSession): void {
        // this.ocppClient.sendCall(
        //     "LEEBOX",
        //     "tenantId",
        //     CallAction.RequestStartTransaction,
        //     "RequestStartTransactionRequest",
        //     undefined
        // );
    }
}
