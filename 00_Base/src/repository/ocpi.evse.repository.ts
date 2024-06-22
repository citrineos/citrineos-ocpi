import { Service } from 'typedi';

// TODO: remove in favor of more concrete solution provided by effort for locations module
@Service()
export class OcpiEvseEntityRepository {
  public findByUid(evseUid: string): OcpiEvseEntity {
    const ocpiEvseEntity = new OcpiEvseEntity();
    ocpiEvseEntity.uid = evseUid;
    ocpiEvseEntity.id = 'evseId';
    ocpiEvseEntity.chargingStationId = 'CS01';
    return ocpiEvseEntity;
  }
}

export class OcpiEvseEntity {
  id!: string;
  uid!: string;
  chargingStationId!: string;
}
