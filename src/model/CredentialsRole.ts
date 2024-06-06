import {BusinessDetails} from './BusinessDetails';
import {Role} from './Role';
import {Model} from "sequelize-typescript";
import {ClientInformation} from "./client.information";
import {CpoTenant} from "./cpo.tenant";

export class CredentialsRole extends Model {
  role!: Role;
  business_details!: BusinessDetails;
  clientInformationId!: number;
  clientInformation!: ClientInformation;
  cpoTenantId!: number;
  cpoTenant!: CpoTenant;
}
