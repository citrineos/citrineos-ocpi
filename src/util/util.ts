import {CredentialsRole} from "../model/CredentialsRole";
import {Role} from "../model/Role";

export type Constructor<T = unknown> = new (...args: any[]) => T;

export const invalidClientCredentialsRoles = (roles: CredentialsRole[]) => roles.some(role => role.role !== Role.EMSP);
export const invalidServerCredentialsRoles = (roles: CredentialsRole[]) => roles.some(role => role.role !== Role.CPO);

export enum CountryCode {
  US = 'US',
  CA = 'CA',
  MX = 'MX'
}
