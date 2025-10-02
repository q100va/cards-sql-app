//import { BaseModel } from "./base-model";
//import { DefaultAddressParams } from "./address-filter";

import type { Toponym } from "@shared/schemas/toponym.schema";

export type { Toponym };

/* export interface Toponym {
  id: number;
  name: string;
  defaultAddressParams?: DefaultAddressParams;
  shortName?: string;
  postName?: string;
  shortPostName?: string;
  isFederalCity?: boolean;
  isCapitalOfRegion?: boolean;
  isCapitalOfDistrict?: boolean;
  countryName?: string;
  regionName?: string;
  districtName?: string;
} */

  export interface ToponymFormControlsValues {
  name: string;
  shortName?: string;
  postName?: string;
  shortPostName?: string;
  isFederalCity?: boolean;
  isCapitalOfRegion?: boolean;
  isCapitalOfDistrict?: boolean;
}
