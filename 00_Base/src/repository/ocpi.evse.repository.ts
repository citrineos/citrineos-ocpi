import { Service } from "typedi";
import { OcpiEvse } from "../model/Evse";
import { SequelizeRepository } from '@citrineos/data';

/**
 * OCPI Evse representation
 */
@Service()
export class OcpiEvseRepository extends SequelizeRepository<OcpiEvse> {

}
