import { countrySchema } from "../../modules/location/schema";
import { BaseService } from "./base.service";

export class CountryService extends BaseService<typeof countrySchema> {
    constructor() {
        super(countrySchema, "Country");
    }
}

export default new CountryService();
