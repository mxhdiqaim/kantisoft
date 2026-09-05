import { addressSchema } from "../database/schema";
import { BaseService } from "./base.service";

export class AddressService extends BaseService<typeof addressSchema> {
    constructor() {
        super(addressSchema, "Address");
    }
}

export default new AddressService();
