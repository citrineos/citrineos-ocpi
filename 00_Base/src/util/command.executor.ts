import { StartSession } from '../model/StartSession';
import {
  AbstractModule,
  CallAction,
  IdTokenEnumType,
  MessageOrigin,
  RequestStartTransactionRequest,
  RequestStopTransactionRequest,
} from '@citrineos/base';
import { Service } from 'typedi';
import { ResponseUrlRepository } from '../repository/response.url.repository';
import { v4 as uuidv4 } from 'uuid';
import { StopSession } from '../model/StopSession';
import { NotFoundException } from '../exception/NotFoundException';
import { OcpiEvseEntityRepository } from '../repository/ocpi.evse.repository';
import { SequelizeTransactionEventRepository } from '@citrineos/data';

@Service()
export class CommandExecutor {
  constructor(
    readonly abstractModule: AbstractModule,
    readonly responseUrlRepo: ResponseUrlRepository,
    readonly ocpiEvseEntityRepo: OcpiEvseEntityRepository,
    readonly transactionRepo: SequelizeTransactionEventRepository,
  ) {}

  public async executeStartSession(startSession: StartSession): Promise<void> {
    // TODO: update to handle optional evse uid.
    const evse = await this.ocpiEvseEntityRepo.findByUid(
      startSession.evse_uid!,
    );

    if (!evse) {
      throw new NotFoundException('EVSE not found');
    }

    const correlationId = uuidv4();
    const responseUrlEntity = await this.responseUrlRepo.saveResponseUrl(
      correlationId,
      startSession.response_url,
    );

    const request = {
      remoteStartId: responseUrlEntity.id,
      idToken: {
        idToken: startSession.token.contract_id,
        type: IdTokenEnumType.eMAID,
      },
    } as RequestStartTransactionRequest;

    this.abstractModule.sendCall(
      evse.chargingStationId,
      'tenantId',
      CallAction.RequestStartTransaction,
      request,
      undefined,
      correlationId,
      MessageOrigin.CentralSystem,
    );
  }

  public async executeStopSession(stopSession: StopSession): Promise<void> {
    const transaction = await this.transactionRepo.findByTransactionId(
      stopSession.session_id,
    );

    if (!transaction) {
      throw new NotFoundException('Session not found');
    }

    const correlationId = uuidv4();

    await this.responseUrlRepo.saveResponseUrl(
      correlationId,
      stopSession.response_url,
    );

    const request = {
      transactionId: stopSession.session_id,
    } as RequestStopTransactionRequest;

    this.abstractModule.sendCall(
      transaction.stationId,
      'tenantId',
      CallAction.RequestStopTransaction,
      request,
      undefined,
      correlationId,
      MessageOrigin.CentralSystem,
    );
  }
}