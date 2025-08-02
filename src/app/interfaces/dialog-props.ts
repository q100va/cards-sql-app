import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { DefaultAddressParams } from './default-address-params';
import { AddressFilterParams } from './address-filter-params';
import { AddressKey, ToponymType } from './types';
import { User } from './user';
import { Toponym } from './toponym';
import { BaseModel } from './base-model';
import { DetailsComponentType } from '../shared/dialogs/details-dialogs/details-dialog/details-component-registry';
import { AddressFilter } from './address-filter';

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
  dialogProps: DialogData<Toponym>;
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

export interface DialogData<T extends BaseModel> {
  creationTitle: string;
  viewTitle: string;
  controls: Control[];
  checkingName: string;
  addressFilterControls?: AddressFilterControl<AddressKey>[];
  addressFilterParams: AddressFilterParams;

  operation?: 'create' | 'view-edit';
   controlsDisable?: boolean;
   componentType: DetailsComponentType;
  defaultAddressParams?: DefaultAddressParams;
  object: T | null;

  toponymType?: ToponymType;
}

export interface Control {
  controlName: string;
  value: string | boolean | null;// | Date | string[];
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


interface AddressFilterControl<
  AFKey extends AddressKey
> {
  addressFilterProp: AFKey;
  toponymProp: string;
}


