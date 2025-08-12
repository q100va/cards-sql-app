import { BaseModel } from "./base-model";
import { DefaultAddressParams } from "./default-address-params";

export interface Toponym extends BaseModel {
  id: number;
  name: string;
  defaultAddressParams?: DefaultAddressParams;
  shortName?: string;
  postName?: string;
  shortPostName?: string;
 /*  districtId?: number;
  regionId?: number;
  countryId?: number; */
  isFederalCity?: boolean;
  isCapitalOfRegion?: boolean;
  isCapitalOfDistrict?: boolean;}


