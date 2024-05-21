import {CredentialsRepository} from '../repository/credentials.repository';
import {VersionsControllerApi} from '../../../apis/VersionsControllerApi';
import {VersionRepository} from '../repository/version.repository';
import {v4 as uuidv4} from 'uuid';
import {Configuration} from '../../../apis/BaseApi';
import {NotFoundException} from '../exceptions/not.found.exception';
import {ILogObj, Logger} from 'tslog';
import {OcpiNamespace} from '../../../util/ocpi.namespace';
import {Credentials, CredentialsResponse} from '../../../model/Credentials';
import {HttpStatus} from '@citrineos/base';
import {Version} from '../../../model/Version';
import {VersionNumber} from '../../../model/VersionNumber';
import {OcpiEmptyResponse} from "../../../util/ocpi.empty.response";
import {Service} from "typedi";
import {OcpiLogger} from "../../../util/logger";

@Service()
export class CredentialsService {
  constructor(
    private _logger: OcpiLogger,
    private credentialsRepository: CredentialsRepository,
    private versionRepository: VersionRepository,
  ) {
  }

  async getCredentials(
    token: string,
  ): Promise<CredentialsResponse> {
    this._logger.info('getCredentials');
    const credentials = await this.credentialsRepository.readByQuery(
      {
        where: {
          token,
        },
      },
      OcpiNamespace.Credentials,
    );
    if (!credentials) {
      throw new NotFoundException('Credentials not found');
    }
    return CredentialsResponse.build(HttpStatus.OK, credentials);
  }

  async postCredentials(
    token: string,
    credentials: Credentials,
    versionId: VersionNumber
  ): Promise<CredentialsResponse> {
    await this.credentialsRepository.authorizeToken(token);
    await this.getAndUpdateVersions(
      credentials.url,
      credentials.token,
      versionId
    );
    return this.updateExistingCredentialsTokenWithNewGeneratedToken(token);
  }

  async putCredentials(
    token: string,
    credentials: Credentials,
    versionId: VersionNumber
  ): Promise<CredentialsResponse> {
    await this.credentialsRepository.authorizeToken(token);
    await this.getAndUpdateVersions(
      credentials.url,
      credentials.token,
      versionId
    );
    return this.updateExistingCredentialsTokenWithNewGeneratedToken(token);
  }

  async deleteCredentials(
    token: string,
  ): Promise<OcpiEmptyResponse> {
    try {
      await this.credentialsRepository.deleteAllByQuery(
        {
          where: {
            token
          },
        },
        OcpiNamespace.Credentials,
      );
      return OcpiEmptyResponse.build(HttpStatus.OK);
    } catch (e) {
      throw new Error('todo'); // todo error handling
    }
  }

  private async updateExistingCredentialsTokenWithNewGeneratedToken(
    oldToken: string,
  ) {
    try {
      const existingCredentials = await this.credentialsRepository.readByKey(
        oldToken,
        OcpiNamespace.Credentials,
      );
      const generateNewToken = uuidv4();
      if (existingCredentials) {
        const updatedCredentials =
          await this.credentialsRepository.updateByQuery(
            {
              token: generateNewToken,
            } as Credentials,
            {
              where: {
                token: oldToken,
              },
            },
            OcpiNamespace.Credentials,
          );
        if (!updatedCredentials) {
          throw new Error('todo'); // todo error handling
        }
        return CredentialsResponse.build(HttpStatus.OK, updatedCredentials);
      } else {
        throw new Error('todo'); // todo error handling
      }
    } catch (e) {
      throw new Error('todo'); // todo error handling
    }
  }

  private async getAndUpdateVersions(
    url: string,
    token: string,
    versionId: string,
  ) {
    const versionsControllerApi = new VersionsControllerApi(
      new Configuration({
        basePath: url,
      }),
    );
    const versions = await versionsControllerApi.getVersions({
      authorization: token,
    });
    if (!versions || !versions.data) {
      throw new NotFoundException('Versions not found');
    }
    const version = versions.data?.find((v: any) => v.version === versionId);
    if (!version) {
      throw new Error('todo'); // todo error handling
    }
    const versionDetails = await versionsControllerApi.getVersion({
      authorization: token,
      versionId: versionId,
    });
    if (!versionDetails) {
      throw new Error('todo'); // todo error handling
    }
    const existingVersion: Version = await this.versionRepository.readByKey(
      versionId,
      OcpiNamespace.Version,
    );
    if (!existingVersion) {
      throw new Error('todo'); // todo error handling
    }
    await this.versionRepository.updateByKey(
      {
        ...existingVersion,
        url: version.url,
        endpoints: versionDetails.data?.endpoints,
      } as Version,
      versionId,
      OcpiNamespace.Version,
    );
  }
}
