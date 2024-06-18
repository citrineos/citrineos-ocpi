import { Service } from "typedi";
import { BaseClientApi } from "./BaseClientApi";
import { Location } from "../model/Location";
import { EvseDTO } from "../model/Evse";

@Service()
export class LocationsClientApi extends BaseClientApi {
  async putLocation(
    location: Location
  ): Promise<Location> {
    // TODO authorization
    // TODO add validation

    return this.handleResponse(await this.replaceRaw<Location>(
      `/locations/${location.country_code}/${location.party_id}/${location.id}`, location));
  }

  // TODO figure out if it's realistic to pass whole location
  async putEvse(
    location: Location,
    evse: EvseDTO
  ): Promise<EvseDTO> {
    // TODO authorization
    // TODO add validation

    return this.handleResponse(await this.replaceRaw<EvseDTO>(
      `/locations/${location.country_code}/${location.party_id}/${location.id}/${evse.uid}`, evse));
  }

  async putConnector() {

  }

  async patchLocation(
    location: Location
  ): Promise<Location> {
    // TODO authorization
    // TODO add validation

    return this.handleResponse(await this.updateRaw<Location>(
      `/locations/${location.country_code}/${location.party_id}/${location.id}`, location));
  }

  async patchEvse() {

  }

  async patchConnector() {

  }
}
