import { Service } from 'typedi';
import { CancelReservation } from '../model/CancelReservation';
import { ReserveNow } from '../model/ReserveNow';
import { StartSession } from '../model/StartSession';
import { StopSession } from '../model/StopSession';
import { UnlockConnector } from '../model/UnlockConnector';
import { CommandType } from '../model/CommandType';
import { OcpiCommandResponse } from '../model/CommandResponse';
import { CommandExecutor } from '../model/CommandExecutor';

@Service()
export class CommandsService {
  constructor(private commandExecutor: CommandExecutor) {}

  async postCommand(
    commandType: CommandType,
    payload:
      | CancelReservation
      | ReserveNow
      | StartSession
      | StopSession
      | UnlockConnector,
  ): Promise<OcpiCommandResponse> {
    // this.ocppClient.sendRequest();
    // this.responseUrlRepository.createResponseUrl("url");
    this.commandExecutor.execute(payload);
    return new OcpiCommandResponse();
  }

  // async getVersions(token: string): Promise<VersionDTOListResponse> {
  //   await this.credentialsRepository.authorizeToken(token);
  //   const versions: Version[] = await this.versionRepository.readAllByQuery({});
  //   return VersionDTOListResponse.build(
  //     versions.map((version) => version.toVersionDTO()),
  //   );
  // }
  //
  // async getVersionDetails(
  //   token: string,
  //   version: VersionNumber,
  // ): Promise<VersionDetailsDTOResponse> {
  //   await this.credentialsRepository.authorizeToken(token);
  //   const versionDetail: Version | undefined =
  //     await this.versionRepository.readOnlyOneByQuery(
  //       {
  //         where: { version: version },
  //         include: [Endpoint],
  //       },
  //       OcpiNamespace.Version,
  //     );
  //   if (!versionDetail) {
  //     throw new NotFoundException('Version not found');
  //   }
  //   return VersionDetailsDTOResponse.build(versionDetail.toVersionDetailsDTO());
  // }
}
