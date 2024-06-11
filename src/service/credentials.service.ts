import {VersionsClientApi} from '../trigger/VersionsClientApi';
import {v4 as uuidv4} from 'uuid';
import {OcpiNamespace} from '../util/ocpi.namespace';
import {CredentialsDTO} from '../model/CredentialsDTO';
import {VersionNumber} from '../model/VersionNumber';
import {Service} from 'typedi';
import {OcpiLogger} from '../util/logger';
import {BadRequestError, InternalServerError, NotFoundError} from "routing-controllers";
import {ClientInformationRepository} from "../repository/client.information.repository";
import {ClientInformation} from "../model/client.information";
import {Endpoint} from "../model/Endpoint";
import {invalidClientCredentialsRoles, plainToClass} from "../util/util";
import {ClientCredentialsRole} from "../model/client.credentials.role";
import {ClientVersion} from "../model/client.version";

@Service()
export class CredentialsService {
  constructor(
    private logger: OcpiLogger,
    private clientInformationRepository: ClientInformationRepository,
    private versionsClientApi: VersionsClientApi,
  ) {
  }

  async getClientInformation(token: string): Promise<ClientInformation> {
    const clientInformationResponse = await this.clientInformationRepository.readOnlyOneByQuery(
      {
        where: {
          clientToken: token,
        },
        include: [
          {
            model: ClientVersion,
            include: [
              Endpoint
            ]
          }
        ]
      },
      OcpiNamespace.Credentials,
    );
    if (!clientInformationResponse) {
      throw new NotFoundError('Credentials not found');
    }
    const clientInformationObj = clientInformationResponse.dataValues;
    clientInformationObj.clientVersionDetails = clientInformationResponse.dataValues.clientVersionDetails.map((obj: any) => obj.dataValues);
    const result = plainToClass(ClientInformation, clientInformationObj as ClientInformation);
    return result;
  }

  async getCredentials(token: string): Promise<ClientInformation> {
    return await this.getClientInformation(token);
  }

  async postCredentials(
    token: string,
    credentials: CredentialsDTO,
    version: VersionNumber,
  ): Promise<ClientInformation> {
    let clientInformation = await this.getClientInformation(token);
    const freshVersionDetails = await this.getClientVersionDetails(clientInformation, version, credentials);
    const newToken = uuidv4();
    const clientInformationList = await this.clientInformationRepository.updateAllByQuery({
      serverToken: newToken,
      registered: true,
      clientVersionDetails: [
        ...clientInformation.clientVersionDetails.filter(
          (versionDetails) => versionDetails.version !== version
        ),
        freshVersionDetails
      ]
    }, {
      where: {
        clientToken: token
      }
    });
    if (clientInformationList) { // todo use update one by query which should return one item
      clientInformation = clientInformationList[0];
      if (clientInformation) {
        return clientInformation;
      }
    }
    // todo error handling
    throw new InternalServerError('Could not update client information');
  }

  async putCredentials(
    token: string,
    credentials: CredentialsDTO,
    version: VersionNumber,
  ): Promise<ClientInformation> {
    const clientInformation = await this.getClientInformation(token);
    const versionDetails = await this.getClientVersionDetails(clientInformation, version, credentials);
    return await this.updateCredentials(clientInformation, token, credentials, versionDetails);
  }

  async deleteCredentials(token: string): Promise<void> {
    try {
      // todo, is it okay to delete ClientInformation?
      await this.clientInformationRepository.deleteAllByQuery({
          where: {
            clientToken: token,
          },
        },
        OcpiNamespace.Credentials,
      );
      return;
    } catch (e) {
      throw new Error('todo'); // todo error handling
    }
  }

  private async updateCredentials(
    clientInformation: ClientInformation,
    token: string,
    credentials: CredentialsDTO,
    freshVersionDetails: ClientVersion,
  ) {
    if (invalidClientCredentialsRoles(credentials.roles)) {
      throw new BadRequestError('Invalid client credentials roles, must be EMSP');
    }
    const clientInformationList = await this.clientInformationRepository.updateAllByQuery({ // todo need to use update one by query so that one item is returned
        clientCredentialsRoles: credentials.roles as ClientCredentialsRole[],
        clientVersionDetails: [
          ...clientInformation.clientVersionDetails.filter((versionDetails) => versionDetails.version !== freshVersionDetails.version),
          freshVersionDetails
        ]
      }, {
        where: {
          clientToken: token,
        },
      },
      OcpiNamespace.Credentials,
    );
    return clientInformationList[0];
  }

  private async getClientVersionDetails(
    clientInformation: ClientInformation,
    versionNumber: VersionNumber,
    credentials: CredentialsDTO,
  ): Promise<ClientVersion> {
    const existingVersionDetails = clientInformation.clientVersionDetails.map(result => result.dataValues).find((v: ClientVersion) => v.version === versionNumber);
    if (!existingVersionDetails) {
      throw new NotFoundError('Version details not found');
    }
    this.versionsClientApi.baseUrl = existingVersionDetails.url;
    const versions = await this.versionsClientApi.getVersions({
      version: versionNumber,
      authorization: credentials.token,
    });
    if (!versions || !versions.data) {
      throw new NotFoundError('Versions not found');
    }
    const version = versions.data?.find(
      (v: any) => v.version === versionNumber,
    );
    if (!version) {
      throw new NotFoundError('Matching version not found');
    }
    const versionDetails = await this.versionsClientApi.getVersion({
      authorization: credentials.token,
      version: versionNumber,
    });
    if (!versionDetails) { // todo check for successful status globally
      throw new NotFoundError('Matching version details not found');
    }
    const endpoints = versionDetails.data?.endpoints.map(endpoint => Endpoint.buildEndpoint(
      endpoint.identifier,
      endpoint.role,
      endpoint.url
    ));
    return ClientVersion.buildClientVersion(versionNumber, version.url, endpoints!);
  }
}
