import { BaseService } from "../../../shared/service";
import { countrySchema } from "../schema";

class CountryService extends BaseService<typeof countrySchema> {
    constructor() {
        super(countrySchema, "Country");
    }
}

export default new CountryService();
