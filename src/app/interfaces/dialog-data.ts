import { AddressFilterParams } from './address-filter-params';
import { DefaultAddressParams } from './default-address-params';
import { Control } from './toponym-props';
import { GeographyLevels } from './types';

export interface DialogData {
  type: GeographyLevels;
  operation: 'create' | 'view-edit';
  defaultAddressParams: DefaultAddressParams;
  toponym?: {
    [key: string]: string | number | boolean;
  };
  creationTitle: string;
  viewTitle: string;
  controls: Control[];
  checkingName: string;
  addressFilterControls?: {
    addressFilterProp: string;
    toponymProp: string;
  }[];
  addressFilterParams: AddressFilterParams;

}
