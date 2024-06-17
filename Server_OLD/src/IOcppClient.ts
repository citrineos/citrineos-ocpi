import { StartSession } from './model/StartSession';
import { StopSession } from './model/StopSession';
import { CancelReservation } from './model/CancelReservation';
import { ReserveNow } from './model/ReserveNow';
import { UnlockConnector } from './model/UnlockConnector';

export abstract class IOcppClient {
  abstract forward(
    message:
      | CancelReservation
      | ReserveNow
      | StartSession
      | StopSession
      | UnlockConnector,
  ): void;
}
