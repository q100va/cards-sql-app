import { BaseModel } from "./base-model";
import { DefaultAddressParams } from "./default-address-params";

export interface Toponym extends BaseModel {
  id: number;
  name: string;
  defaultAddressParams?: DefaultAddressParams;
  shortName?: string;
  postName?: string;
  shortPostName?: string;
  isFederalCity?: boolean;
  isCapitalOfRegion?: boolean;
  isCapitalOfDistrict?: boolean;
  countryName?: string | null;
  regionName?: string | null;
  districtName?: string | null;
}

  export interface ToponymFormControlsValues {
  name: string;
  shortName?: string;
  postName?: string;
  shortPostName?: string;
  isFederalCity?: boolean;
  isCapitalOfRegion?: boolean;
  isCapitalOfDistrict?: boolean;
}
