export interface Toponym {
  id: number;
  name: string;
  shortName?: string;
  postName?: string;
  shortPostName?: string;
  districtId?: number;
  regionId?: number;
  countryId?: number;
  isFederalCity?: boolean;
  isCapitalOfRegion?: boolean;
  isCapitalOfDistrict?: boolean;
}
