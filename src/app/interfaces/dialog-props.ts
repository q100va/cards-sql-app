import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { DefaultAddressParams } from './default-address-params';
import { AddressFilterParams } from './address-filter-params';
import { GeographyLevels } from './types';

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
  dialogProps: DialogData;
}

/* export interface DialogProps {
  creationTitle: string;
  viewTitle: string;
  controls: Control[];
  checkingName: string;
  addressFilterControls?: {
    addressFilterProp: string;
    toponymProp: string;
  }[];
  addressFilterParams: AddressFilterParams;
} */

export interface DialogData {
  creationTitle: string;
  viewTitle: string;
  controls: Control[];
  checkingName: string;
  addressFilterControls?: {
    addressFilterProp: string;
    toponymProp: string;
  }[];
  addressFilterParams: AddressFilterParams;

  operation?: 'create' | 'view-edit';
   controlsDisable?: boolean;
   componentType?: 'toponym' | 'user';
  defaultAddressParams?: DefaultAddressParams;
  object?: {
    [key: string]: string | number | boolean | any[] | {[key: string]: string | number | boolean | any} | Date;
  };

  toponymType?: GeographyLevels;
}

export interface Control {
  controlName: string;
  value: string | boolean | Date | [] | string[];
  disabled?: boolean;
  validators?: ((
    control: AbstractControl<any, any>
  ) => ValidationErrors | null)[];
  type:
    | 'inputText'
    | 'inputPassword'
    | 'select'
    | 'checkbox'
    | 'radio'
    | 'toggle';
  label: string;
  postfix?: string;
  placeholder?: string;
  errorName?: string;
  category?: string;
  formType: string;
  colspan?: number;
  rowspan?: number;
}


