import {VersionsClientApi} from '../trigger/VersionsClientApi';
import {v4 as uuidv4} from 'uuid';
import {OcpiNamespace} from '../util/ocpi.namespace';
import {CredentialsDTO} from '../model/CredentialsDTO';
import {VersionNumber} from '../model/VersionNumber';
import {OcpiEmptyResponse} from '../model/ocpi.empty.response';
import {Service} from 'typedi';
import {OcpiLogger} from '../util/logger';
import {OcpiResponseStatusCode} from '../model/ocpi.response';
import {BadRequestError, InternalServerError, NotFoundError} from "routing-controllers";
import {ClientInformationRepository} from "../repository/client.information.repository";
import {ClientInformation} from "../model/client.information";
import {Endpoint} from "../model/Endpoint";
import {invalidClientCredentialsRoles} from "../util/util";
import {ClientCredentialsRole} from "../model/client.credentials.role";
import {ClientVersion} from "../model/client.version";

@Service()
export class CredentialsService {
  constructor(
    private logger: OcpiLogger,
    private clientInformationRepository: ClientInformationRepository,
    private versionsClientApi: VersionsClientApi,
    // private credentialsClientApi: CredentialsClientApi
  ) {
  }

  async getClientInformation(token: string): Promise<ClientInformation> {
    const clientInformation = await this.clientInformationRepository.readOnlyOneByQuery(
      {
        where: {
          clientToken: token,
        },
      },
      OcpiNamespace.Credentials,
    );
    if (!clientInformation) {
      throw new NotFoundError('Credentials not found');
    }
    return clientInformation;
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
    const freshVersionDetails = await this.getVersionDetails(clientInformation, version, credentials);
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

    // todo do we need below logic?
    /* const credentialsEndpoint = endpoints?.find(
      endpoint => endpoint.identifier === ModuleId.Credentials
    );
    if (credentialsEndpoint) {
      const credentialsUrl = credentialsEndpoint.url;
      if (credentialsUrl) {
        // generate new token and POST
        const newToken = uuidv4();

        const credentialsDTO = CredentialsDTO.build(
          newToken,
          credentialsUrl,
          clientInformation.cpoTenant.serverCredentialsRoles // todo maybe serverCredentialsRoles should be in ClientInformation?
        );

        this.credentialsClientApi.baseUrl = credentialsUrl;
        const credentialsResponse = await this.credentialsClientApi.postCredentials(buildPostCredentialsParams(
          version,
          clientInformation.serverToken,
          credentialsDTO
        ));
        if (credentialsResponse) { // todo check successful status code

          clientInformation.registered = true;

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
              serverToken: clientInformation.serverToken
            }
          });
          if (clientInformationList) { // todo use update one by query
            clientInformation = clientInformationList[0];
            if (clientInformation) {

            }
          }
          return clientInformation;
        }
      }
    }*/
  }

  async putCredentials(
    token: string,
    credentials: CredentialsDTO,
    version: VersionNumber,
  ): Promise<ClientInformation> {
    const clientInformation = await this.getClientInformation(token);
    const versionDetails = await this.getVersionDetails(clientInformation, version, credentials);
    return await this.updateCredentials(clientInformation, token, credentials, versionDetails);
  }

  async deleteCredentials(token: string): Promise<OcpiEmptyResponse> {
    try {
      await this.clientInformationRepository.deleteAllByQuery({
          where: {
            clientToken: token,
          },
        },
        OcpiNamespace.Credentials,
      );
      return OcpiEmptyResponse.build(OcpiResponseStatusCode.GenericSuccessCode);
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

  private async getVersionDetails(
    clientInformation: ClientInformation,
    versionNumber: VersionNumber,
    credentials: CredentialsDTO,
  ): Promise<ClientVersion> {
    const existingVersionDetails = clientInformation.clientVersionDetails.find((v) => v.version === versionNumber);
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
