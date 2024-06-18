import { Constructable } from 'typedi';

export abstract class OcpiModule {
  public abstract getController(): Constructable<any>;
}
