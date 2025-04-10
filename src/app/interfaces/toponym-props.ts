import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { DefaultAddressParams } from './default-address-params';

export interface Control {
  controlName: string;
  value: string | boolean;
  disabled: boolean;
  validators?: ((
    control: AbstractControl<any, any>
  ) => ValidationErrors | null)[];
}

export interface DialogProps {
  creationTitle: string;
  viewTitle: string;
  placeHolders: {
    [key: string]: string;
  };
  controls: Control[];
  checkingName: string;
  addressFilterControls?: {
    addressFilterProp: string;
    toponymProp: string;
  }[];
}

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
  queryParams: DefaultAddressParams | null;
  defaultCountryId: number | null;
  defaultRegionId: number | null;
  defaultDistrictId: number | null;
  defaultLocalityId: number | null;
  isShowCountry: boolean;
  isShowRegion: boolean;
  isShowDistrict: boolean;
  isShowLocality: boolean;
  searchPlaceHolder: string;
  dialogProps: DialogProps;
}
