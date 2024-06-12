import {Role} from "../model/Role";
import {plainToInstance} from "class-transformer";
import {CredentialsRoleDTO} from "../model/DTO/CredentialsRoleDTO";

export type Constructor<T = unknown> = new (...args: any[]) => T;

export const invalidClientCredentialsRoles = (roles: CredentialsRoleDTO[]) => roles.some(role => role.role !== Role.EMSP);
export const invalidServerCredentialsRoles = (roles: CredentialsRoleDTO[]) => roles.some(role => role.role !== Role.CPO);

export enum CountryCode {
  US = 'US',
  CA = 'CA',
  MX = 'MX'
}

export const plainToClass = <T>(constructor: Constructor<T>, plain: T): T => {
  return plainToInstance(constructor, plain as T, {
    excludeExtraneousValues: true
  });
}
