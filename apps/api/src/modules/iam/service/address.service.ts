import { BaseService } from "../../../shared/service";
import { addressSchema } from "../../../shared/database/schema";

class AddressService extends BaseService<typeof addressSchema> {
    constructor() {
        super(addressSchema, "Address");
    }
}

export default new AddressService();
