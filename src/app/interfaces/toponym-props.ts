export interface ToponymProps {
  title: string;
  displayedColumns: (
    | 'name'
    | 'shortName'
    | 'postName'
    | 'shortPostName'
    | 'district'
    | 'region'
    | 'country'
    | 'actions'
  )[];
  filename: string;
  isShowCountry: boolean;
  isShowRegion: boolean;
  isShowDistrict: boolean;
  isShowLocality: boolean;
  defaultCountryId: number | null;
  defaultRegionId: number | null;
  defaultDistrictId: number | null;
  defaultLocalityId: number | null;
  creationTitle: string;
  viewTitle: string;
  searchPlaceHolder: string;
  namePlaceHolder: string;
  shortNamePlaceHolder: string;
  postNamePlaceHolder: string;
  shortPostNamePlaceHolder: string;

}
