export interface AddressFilterParams {
  source: 'toponymCard' | 'toponymList' | 'userCard' | 'userList';
  multiple: boolean;
  cols: string;
  gutterSize: string;
  rowHeight: string;
  type?: string | undefined;
  isShowCountry: boolean;
  isShowRegion: boolean;
  isShowDistrict: boolean;
  isShowLocality: boolean;
  readonly?: boolean | undefined;
  class: string;
}
