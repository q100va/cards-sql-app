import { AbstractControl, ValidationErrors } from '@angular/forms';
import {
  AddressFilterParams,
  DefaultAddressParams,
  AddressKey,
  ToponymType,
  AddressFilterControl,
} from './toponym';
import { BaseModel } from './base-model';
import { DetailsComponentType } from '../shared/dialogs/details-dialogs/details-dialog/details-component-registry';

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
  value: string | boolean | null; // | Date | string[];
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
