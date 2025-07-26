/* import { AddressFilterParams } from './address-filter-params';
import { DefaultAddressParams } from './default-address-params';
import { Control } from './dialog-props';
import { GeographyLevels } from './types';

export interface DialogData {
  type: GeographyLevels;
  operation: 'create' | 'view-edit';
  defaultAddressParams: DefaultAddressParams;
  object?: {
    [key: string]: string | number | boolean;
  };
  creationTitle: string;
  viewTitle: string;
  controlsDisable: boolean;
  controls: Control[];
  checkingName: string;
  addressFilterControls?: {
    addressFilterProp: string;
    toponymProp: string;
  }[];
  addressFilterParams: AddressFilterParams;
  componentType: 'toponym' | 'user';

} */
